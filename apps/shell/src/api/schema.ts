/**
 * Generated from services/api/docs/openapi.yaml by tools/openapi-types (ADR-0014).
 * Do not edit: change the contract, then run `npm run api:types`.
 */
export interface paths {
  '/api/v1/projects': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * List the published projects
     * @description Published projects only, ordered for display (position, then slug). No pagination.
     */
    get: operations['listProjects'];
    /** Not supported */
    put: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        405: components['responses']['MethodNotAllowed'];
      };
    };
    /** Not supported */
    post: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        405: components['responses']['MethodNotAllowed'];
      };
    };
    /** Not supported */
    delete: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        405: components['responses']['MethodNotAllowed'];
      };
    };
    options?: never;
    head?: never;
    /** Not supported */
    patch: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        405: components['responses']['MethodNotAllowed'];
      };
    };
    trace?: never;
  };
  '/api/v1/projects/{slug}': {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description The project's public identifier. Any string is accepted in the path; only lowercase hyphenated slugs can match a project, anything else is a 404. */
        slug: components['parameters']['Slug'];
      };
      cookie?: never;
    };
    /** Get a published project by its slug */
    get: operations['getProject'];
    /** Not supported */
    put: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          /** @description The project's public identifier. Any string is accepted in the path; only lowercase hyphenated slugs can match a project, anything else is a 404. */
          slug: components['parameters']['Slug'];
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        405: components['responses']['MethodNotAllowed'];
      };
    };
    /** Not supported */
    post: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          /** @description The project's public identifier. Any string is accepted in the path; only lowercase hyphenated slugs can match a project, anything else is a 404. */
          slug: components['parameters']['Slug'];
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        405: components['responses']['MethodNotAllowed'];
      };
    };
    /** Not supported */
    delete: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          /** @description The project's public identifier. Any string is accepted in the path; only lowercase hyphenated slugs can match a project, anything else is a 404. */
          slug: components['parameters']['Slug'];
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        405: components['responses']['MethodNotAllowed'];
      };
    };
    options?: never;
    head?: never;
    /** Not supported */
    patch: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          /** @description The project's public identifier. Any string is accepted in the path; only lowercase hyphenated slugs can match a project, anything else is a 404. */
          slug: components['parameters']['Slug'];
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        405: components['responses']['MethodNotAllowed'];
      };
    };
    trace?: never;
  };
  '/api/v1/contact_messages': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Not supported */
    get: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        405: components['responses']['PostOnly'];
      };
    };
    /** Not supported */
    put: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        405: components['responses']['PostOnly'];
      };
    };
    /**
     * Send a contact message
     * @description Stores a message for the site owner (ADR-0013). The response never contains an id or any
     *     submitted value. Abuse protection, per client IP: at most 20 requests and 5 accepted
     *     messages per hour (429 beyond that). `website` is a honeypot that people never see: when
     *     it is filled, the response is the same 202 but nothing is stored. The body must be a JSON
     *     object of at most 32 KB.
     */
    post: operations['createContactMessage'];
    /** Not supported */
    delete: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        405: components['responses']['PostOnly'];
      };
    };
    options?: never;
    head?: never;
    /** Not supported */
    patch: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        405: components['responses']['PostOnly'];
      };
    };
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    ContactMessageRequest: {
      /** @description Trimmed, inner whitespace collapsed; no control characters. */
      name: string;
      /** @description Trimmed and lowercased; must look like an email address. */
      email: string;
      /** @description Trimmed; newlines and tabs allowed, no other control characters. */
      message: string;
      locale: components['schemas']['Locale'];
      /** @description Honeypot. Leave empty; the form hides it from people. */
      website?: string;
    };
    ContactMessageAccepted: {
      data: {
        /** @enum {string} */
        status: 'received';
      };
    };
    /**
     * @description The page language the message was sent from (the shell's locales).
     * @enum {string}
     */
    Locale: 'en' | 'pt-BR';
    ValidationError: {
      error: {
        /** @enum {string} */
        code: 'validation_failed';
        message: string;
        details: {
          name?: components['schemas']['ValidationCodes'];
          email?: components['schemas']['ValidationCodes'];
          message?: components['schemas']['ValidationCodes'];
          locale?: components['schemas']['ValidationCodes'];
        };
      };
    };
    ValidationCodes: ('blank' | 'too_short' | 'too_long' | 'invalid' | 'inclusion')[];
    ProjectList: {
      data: components['schemas']['Project'][];
    };
    ProjectResponse: {
      data: components['schemas']['Project'];
    };
    Project: {
      slug: string;
      name: components['schemas']['LocalizedText120'];
      description: components['schemas']['LocalizedText1000'];
      status: components['schemas']['Status'];
      /** @description Technology ids in badge order (labels and colours belong to the client). */
      technologies: components['schemas']['Technology'][];
      /** @description In display order. */
      links: components['schemas']['ProjectLink'][];
    };
    ProjectLink: {
      label: components['schemas']['LocalizedText60'];
      url: string;
    };
    /**
     * @description Delivery status, shown as words (the shell's content/status.ts).
     * @enum {string}
     */
    Status: 'done' | 'live' | 'in-progress' | 'planned';
    /**
     * @description Technology ids (the shell's sections/technologies.ts).
     * @enum {string}
     */
    Technology: 'react' | 'typescript' | 'vite' | 'react-router' | 'vue' | 'rails';
    LocalizedText120: {
      en: string;
      'pt-BR': string;
    };
    LocalizedText1000: {
      en: string;
      'pt-BR': string;
    };
    LocalizedText60: {
      en: string;
      'pt-BR': string;
    };
    Error: {
      error: {
        /** @enum {string} */
        code:
          | 'bad_request'
          | 'not_found'
          | 'method_not_allowed'
          | 'payload_too_large'
          | 'unsupported_media_type'
          | 'validation_failed'
          | 'rate_limited'
          | 'internal_error';
        message: string;
        details: Record<string, unknown>;
      };
    };
  };
  responses: {
    /** @description An unexpected error. The message is generic: exception details are never returned (production behaviour; development shows Rails' detailed error response instead). */
    InternalError: {
      headers: {
        [name: string]: unknown;
      };
      content: {
        /**
         * @example {
         *       "error": {
         *         "code": "internal_error",
         *         "message": "Internal Server Error",
         *         "details": {}
         *       }
         *     }
         */
        'application/json': components['schemas']['Error'];
      };
    };
    /** @description The API is read-only. The Allow header lists the supported methods. The answer is the same whatever the request body (any body sent to these paths is ignored). */
    MethodNotAllowed: {
      headers: {
        Allow: 'GET, HEAD';
        [name: string]: unknown;
      };
      content: {
        /**
         * @example {
         *       "error": {
         *         "code": "method_not_allowed",
         *         "message": "Method not allowed",
         *         "details": {}
         *       }
         *     }
         */
        'application/json': components['schemas']['Error'];
      };
    };
    /** @description Messages can only be sent (POST); nothing can read them over HTTP. The answer is the same whatever the request body. */
    PostOnly: {
      headers: {
        Allow: 'POST';
        [name: string]: unknown;
      };
      content: {
        'application/json': components['schemas']['Error'];
      };
    };
  };
  parameters: {
    /** @description The project's public identifier. Any string is accepted in the path; only lowercase hyphenated slugs can match a project, anything else is a 404. */
    Slug: string;
  };
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  listProjects: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description The published projects, in display order (possibly empty). */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          /**
           * @example {
           *       "data": [
           *         {
           *           "slug": "developer-portfolio",
           *           "name": {
           *             "en": "Developer Portfolio (this site)",
           *             "pt-BR": "Portfólio de Desenvolvedor (este site)"
           *           },
           *           "description": {
           *             "en": "An interactive portfolio built as a set of independent applications.",
           *             "pt-BR": "Um portfólio interativo construído como um conjunto de aplicações independentes."
           *           },
           *           "status": "in-progress",
           *           "technologies": [
           *             "react",
           *             "typescript",
           *             "vite",
           *             "react-router"
           *           ],
           *           "links": [
           *             {
           *               "label": {
           *                 "en": "GitHub profile",
           *                 "pt-BR": "Perfil no GitHub"
           *               },
           *               "url": "https://github.com/BrunoSGuima"
           *             }
           *           ]
           *         }
           *       ]
           *     }
           */
          'application/json': components['schemas']['ProjectList'];
        };
      };
      500: components['responses']['InternalError'];
    };
  };
  getProject: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description The project's public identifier. Any string is accepted in the path; only lowercase hyphenated slugs can match a project, anything else is a 404. */
        slug: components['parameters']['Slug'];
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description The project. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['ProjectResponse'];
        };
      };
      /** @description No published project has this slug. Unknown, unpublished and badly formed slugs get the same response, so unpublished projects can't be discovered. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          /**
           * @example {
           *       "error": {
           *         "code": "not_found",
           *         "message": "Project not found",
           *         "details": {}
           *       }
           *     }
           */
          'application/json': components['schemas']['Error'];
        };
      };
      500: components['responses']['InternalError'];
    };
  };
  createContactMessage: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        'application/json': components['schemas']['ContactMessageRequest'];
      };
    };
    responses: {
      /** @description Accepted (also returned, with nothing stored, when the honeypot is filled). */
      202: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          /**
           * @example {
           *       "data": {
           *         "status": "received"
           *       }
           *     }
           */
          'application/json': components['schemas']['ContactMessageAccepted'];
        };
      };
      /** @description The body isn't a JSON object. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Error'];
        };
      };
      /** @description The body is larger than 32 KB (or has no Content-Length). */
      413: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Error'];
        };
      };
      /** @description The body isn't application/json. */
      415: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Error'];
        };
      };
      /** @description Invalid fields. `details` maps each invalid field to validation codes. */
      422: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          /**
           * @example {
           *       "error": {
           *         "code": "validation_failed",
           *         "message": "The message could not be sent",
           *         "details": {
           *           "email": [
           *             "invalid"
           *           ],
           *           "message": [
           *             "too_short"
           *           ]
           *         }
           *       }
           *     }
           */
          'application/json': components['schemas']['ValidationError'];
        };
      };
      /** @description Too many requests or messages from this client; try again later. */
      429: {
        headers: {
          /** @description Seconds to wait (the length of the limit's window). */
          'Retry-After': string;
          [name: string]: unknown;
        };
        content: {
          'application/json': components['schemas']['Error'];
        };
      };
      500: components['responses']['InternalError'];
    };
  };
}
