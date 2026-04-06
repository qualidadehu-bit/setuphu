import { onRequestOptions as __api_auth_js_onRequestOptions } from "C:\\Setup\\setup-hu\\functions\\api\\auth.js"
import { onRequestPost as __api_auth_js_onRequestPost } from "C:\\Setup\\setup-hu\\functions\\api\\auth.js"
import { onRequestGet as __api_me_js_onRequestGet } from "C:\\Setup\\setup-hu\\functions\\api\\me.js"
import { onRequestOptions as __api_me_js_onRequestOptions } from "C:\\Setup\\setup-hu\\functions\\api\\me.js"

export const routes = [
    {
      routePath: "/api/auth",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_auth_js_onRequestOptions],
    },
  {
      routePath: "/api/auth",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_js_onRequestPost],
    },
  {
      routePath: "/api/me",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_me_js_onRequestGet],
    },
  {
      routePath: "/api/me",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_me_js_onRequestOptions],
    },
  ]