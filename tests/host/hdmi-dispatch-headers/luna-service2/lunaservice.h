#pragma once
#include <glib.h>
struct LSHandle{};struct LSMessage;struct LSError{int error_code;};using LSMessageToken=unsigned long;
constexpr LSMessageToken LSMESSAGE_TOKEN_INVALID=0;
using LSFilterFunc=bool(*)(LSHandle*,LSMessage*,void*);
extern "C"{
void LSErrorInit(LSError*);void LSErrorFree(LSError*);bool LSRegisterPubPriv(const char*,LSHandle**,bool,LSError*);
const char* LSHandleGetName(LSHandle*);bool LSGmainContextAttach(LSHandle*,GMainContext*,LSError*);
bool LSSetDisconnectHandler(LSHandle*,void(*)(LSHandle*,void*),void*,LSError*);
bool LSCallOneReply(LSHandle*,const char*,const char*,LSFilterFunc,void*,LSMessageToken*,LSError*);
bool LSCallCancel(LSHandle*,LSMessageToken,LSError*);bool LSUnregister(LSHandle*,LSError*);const char* LSMessageGetPayload(LSMessage*);
}
