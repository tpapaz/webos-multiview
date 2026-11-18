// Offline only. Inputs are private, source-validated capture records in producer order.
const maxBytes = 64 * 1024;
const eventKinds = new Set(['open', 'bind', 'element_open', 'register', 'associate', 'acquire', 'grant', 'descriptor']);
const identifier = value => typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(value);
const scaler = name => typeof name === 'string' && (name === 'SCALER' || name.endsWith('_SCALER'));
const unknown = reason => ({status: 'unknown', port: 2, firstScaler: null, reason});

function parseAcquire(event) {
    if (event.source !== 'media-server' || event.eventId !== 'ACQUIRE_REQUEST' ||
        typeof event.message !== 'string' || event.message.length > 8192) return null;
    const match = /^connectionId: ([A-Za-z0-9_.:-]{1,128})\. resources: (\[[^\r\n]*\])$/.exec(event.message);
    if (!match) return null;
    try {
        const resources = JSON.parse(match[2]);
        if (resources.length === 0 || !resources.every(entry =>
            entry && typeof entry.resource === 'string' && /^[A-Z0-9_]{1,48}$/.test(entry.resource) &&
            Number.isSafeInteger(entry.qty) && entry.qty > 0)) return null;
        return {childId: match[1], names: resources.map(entry => entry.resource)};
    } catch {
        return null;
    }
}

function classify(record) {
    const {version, coverage, events} = record || {};
    if (version !== 1 || !Array.isArray(events) || events.length > 256 ||
        events.some(event => !eventKinds.has(event?.kind))) return unknown('invalid_record');
    if (coverage?.startedBeforeOpen !== true || coverage?.continuous !== true ||
        coverage?.requestStreamComplete !== true) return unknown('capture_incomplete');

    function unique(kind, matches) {
        const found = events.filter(event => event.kind === kind && matches(event));
        return found.length === 1 ? found[0] : undefined;
    }

    const bind = unique('bind', event => event.port === 2);
    if (!bind || !identifier(bind.logicalId) || !identifier(bind.serviceId) ||
        unique('bind', event => event.logicalId === bind.logicalId) !== bind ||
        unique('bind', event => event.serviceId === bind.serviceId) !== bind) return unknown('hdmi2_binding_unproven');
    const open = unique('open', event => event.logicalId === bind.logicalId);
    if (open?.disposition !== 'fresh' || !identifier(open.logicalId)) return unknown('fresh_open_unproven');
    const element = unique('element_open', event => event.serviceId === bind.serviceId);
    if (element?.disposition !== 'fresh' || !identifier(element.pipelineId) || element.firstParentId !== element.pipelineId ||
        unique('element_open', event => event.pipelineId === element.pipelineId) !== element) return unknown('fresh_element_unproven');
    const connectors = events.filter(event => event.kind === 'register' && event.pipelineId === element.pipelineId &&
        event.connectionType === 'avconnector');
    if (!connectors.length || connectors.some(event => !identifier(event.childId) ||
        unique('register', other => other.childId === event.childId) !== event)) return unknown('child_registration_unproven');

    // The same HDMI pipeline can register separate audio and video children.
    const requests = events.map(event => event.kind === 'acquire' ? parseAcquire(event) : null);
    let register = connectors[0];
    if (connectors.length > 1) {
        if (events.some((event, index) => event.kind === 'acquire' && !requests[index])) return unknown('unreadable_acquire_request');
        const scalerChildren = new Set(requests.filter(request => request && request.names.some(scaler)).map(request => request.childId));
        for (const event of events) {
            if (event.kind === 'grant' && scaler(event.resource)) scalerChildren.add(event.childId);
        }
        const candidates = connectors.filter(event => scalerChildren.has(event.childId));
        if (candidates.length !== 1) return unknown('video_child_unproven');
        register = candidates[0];
    }
    const association = unique('associate', event => event.childId === register.childId);
    if (association?.accepted !== true || association.ownerPipelineId !== element.pipelineId) return unknown('owner_association_unproven');

    const order = [open, bind, element, register].map(event => events.indexOf(event));
    const associationIndex = events.indexOf(association);
    if (order.some((position, i) => i > 0 && position <= order[i - 1]) ||
        associationIndex <= order.at(-1)) return unknown('identity_order_conflict');

    for (const [index, event] of events.entries()) {
        if (event.kind === 'grant' && event.childId === register.childId && scaler(event.resource)) {
            return unknown('earlier_scaler_grant');
        }
        if (event.kind !== 'acquire') continue;
        const request = requests[index];
        if (!request) return unknown('unreadable_acquire_request');
        if (request.childId !== register.childId) continue;
        if (index <= order.at(-1)) return unknown('identity_order_conflict');
        const scalers = new Set(request.names.filter(scaler));
        if (!scalers.size) continue;
        if (scalers.size !== 1) return unknown('ambiguous_first_scaler');
        const [firstScaler] = scalers;
        if (firstScaler !== 'MAIN_SCALER' && firstScaler !== 'SUB_SCALER') return unknown('unclassified_first_scaler');
        return {status: 'first_request_observed', port: 2, firstScaler,
            associationOrder: associationIndex < index ? 'before_request' : 'after_request'};
    }
    return unknown('no_scaler_request');
}

async function run() {
    let bytes = 0;
    const chunks = [];
    for await (const chunk of process.stdin) {
        bytes += chunk.length;
        if (bytes > maxBytes) return unknown('capture_size_cap');
        chunks.push(chunk);
    }
    try {
        return classify(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    } catch {
        return unknown('invalid_record');
    }
}

if (require.main === module) run().then(result => {
    console.log(JSON.stringify(result));
    if (result.status === 'unknown') process.exitCode = 1;
}, () => {
    console.log(JSON.stringify(unknown('unreadable_input')));
    process.exitCode = 1;
});

module.exports = {classify};
