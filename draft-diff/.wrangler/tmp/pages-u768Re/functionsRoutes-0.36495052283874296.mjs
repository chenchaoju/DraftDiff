import { onRequestDelete as __api_articles__id__js_onRequestDelete } from "/workspace/draft-diff/functions/api/articles/[id].js"
import { onRequestGet as __api_articles__id__js_onRequestGet } from "/workspace/draft-diff/functions/api/articles/[id].js"
import { onRequestOptions as __api_articles__id__js_onRequestOptions } from "/workspace/draft-diff/functions/api/articles/[id].js"
import { onRequestPut as __api_articles__id__js_onRequestPut } from "/workspace/draft-diff/functions/api/articles/[id].js"
import { onRequestGet as __api_articles_js_onRequestGet } from "/workspace/draft-diff/functions/api/articles.js"
import { onRequestOptions as __api_articles_js_onRequestOptions } from "/workspace/draft-diff/functions/api/articles.js"
import { onRequestPost as __api_articles_js_onRequestPost } from "/workspace/draft-diff/functions/api/articles.js"
import { onRequestGet as __api_categories_js_onRequestGet } from "/workspace/draft-diff/functions/api/categories.js"
import { onRequestOptions as __api_categories_js_onRequestOptions } from "/workspace/draft-diff/functions/api/categories.js"

export const routes = [
    {
      routePath: "/api/articles/:id",
      mountPath: "/api/articles",
      method: "DELETE",
      middlewares: [],
      modules: [__api_articles__id__js_onRequestDelete],
    },
  {
      routePath: "/api/articles/:id",
      mountPath: "/api/articles",
      method: "GET",
      middlewares: [],
      modules: [__api_articles__id__js_onRequestGet],
    },
  {
      routePath: "/api/articles/:id",
      mountPath: "/api/articles",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_articles__id__js_onRequestOptions],
    },
  {
      routePath: "/api/articles/:id",
      mountPath: "/api/articles",
      method: "PUT",
      middlewares: [],
      modules: [__api_articles__id__js_onRequestPut],
    },
  {
      routePath: "/api/articles",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_articles_js_onRequestGet],
    },
  {
      routePath: "/api/articles",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_articles_js_onRequestOptions],
    },
  {
      routePath: "/api/articles",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_articles_js_onRequestPost],
    },
  {
      routePath: "/api/categories",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_categories_js_onRequestGet],
    },
  {
      routePath: "/api/categories",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_categories_js_onRequestOptions],
    },
  ]