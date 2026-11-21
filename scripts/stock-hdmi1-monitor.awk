BEGIN { ready=0 }
{
    envelope = /"(sender|destination)"[[:space:]]*:[[:space:]]*"com[.]webos[.](media|service[.](videooutput|extinputs([.]hdmi)?|utp[.]extinputs))"/
    if (!envelope) next
    if (!ready) { print "FOCUSED_STREAM_READY"; fflush(); ready=1 }
    selected = /"method"[[:space:]]*:[[:space:]]*"(open|switchExternalInput|registerPipeline|setOwnerPipeline|acquire|tryAcquire|acquireComplete|connect|register)"/
    reply = /"type"[[:space:]]*:[[:space:]]*"(return|error)"/
    if (selected || reply) {
        if (length($0)>32768) print "FOCUSED_LINE_CAPPED"; else print $0
        fflush()
    }
}
END {print "FOCUSED_STREAM_END"; fflush()}
