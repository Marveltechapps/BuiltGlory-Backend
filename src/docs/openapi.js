export const openapi = {
  "openapi": "3.1.0",
  "info": {
    "title": "BuiltGlory Backend API",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "/api/v1"
    }
  ],
  "paths": {
    "/app/config": {
      "get": {
        "tags": [
          "App Config"
        ],
        "summary": "Public app version, maintenance, store URL, and feature flag config",
        "responses": {
          "200": {
            "description": "Public app configuration",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/content": {
      "get": {
        "tags": [
          "Content"
        ],
        "summary": "List published app content",
        "parameters": [
          {
            "in": "query",
            "name": "section",
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "query",
            "name": "category",
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "query",
            "name": "search",
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "query",
            "name": "limit",
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Published content items",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/content/{slug}": {
      "get": {
        "tags": [
          "Content"
        ],
        "summary": "Get one published content item by slug",
        "parameters": [
          {
            "in": "path",
            "name": "slug",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Published content item",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Content not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/content": {
      "get": {
        "tags": [
          "Admin Content"
        ],
        "summary": "List CMS content items",
        "responses": {
          "200": {
            "description": "Content items",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "Admin Content"
        ],
        "summary": "Create CMS content item",
        "responses": {
          "201": {
            "description": "Content item created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/content/reorder": {
      "patch": {
        "tags": [
          "Admin Content"
        ],
        "summary": "Reorder CMS content items",
        "responses": {
          "200": {
            "description": "Reordered content items",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/content/{contentId}": {
      "patch": {
        "tags": [
          "Admin Content"
        ],
        "summary": "Update CMS content item",
        "parameters": [
          {
            "in": "path",
            "name": "contentId",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Content item updated",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Admin Content"
        ],
        "summary": "Archive CMS content item",
        "parameters": [
          {
            "in": "path",
            "name": "contentId",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": "Content item archived",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/settings": {
      "get": {
        "tags": [
          "Admin Settings"
        ],
        "summary": "Get organization, SLA, alert, notification, display, and Tools settings",
        "responses": {
          "200": {
            "description": "Admin settings",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "patch": {
        "tags": [
          "Admin Settings"
        ],
        "summary": "Update organization, SLA, alert, notification, display, and Tools settings",
        "responses": {
          "200": {
            "description": "Updated admin settings",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/workflow/{entityType}/{entityId}/lock": {
      "get": {
        "summary": "Read active edit lock",
        "parameters": [
          {
            "name": "entityType",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "entityId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Active lock or null",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Claim or refresh edit lock",
        "parameters": [
          {
            "name": "entityType",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "entityId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Lock state",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "delete": {
        "summary": "Release edit lock",
        "parameters": [
          {
            "name": "entityType",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "entityId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Released",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/auth/customer/otp/send": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Send customer OTP",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "phone"
                ],
                "properties": {
                  "countryCode": {
                    "type": "string",
                    "example": "+91"
                  },
                  "phone": {
                    "type": "string",
                    "pattern": "^\\d{10}$",
                    "example": "9876543210"
                  },
                  "deviceId": {
                    "type": "string",
                    "example": "device_123"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OTP request issued",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/ValidationError"
          },
          "429": {
            "description": "Rate limited",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/auth/customer/otp/verify": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Verify customer 6-digit OTP",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "phone",
                  "otp"
                ],
                "properties": {
                  "requestId": {
                    "type": "string",
                    "example": "otp_req_00000000-0000-0000-0000-000000000000"
                  },
                  "countryCode": {
                    "type": "string",
                    "example": "+91"
                  },
                  "phone": {
                    "type": "string",
                    "pattern": "^\\d{10}$",
                    "example": "9876543210"
                  },
                  "otp": {
                    "type": "string",
                    "pattern": "^\\d{6}$",
                    "example": "123456"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Customer session",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/ValidationError"
          }
        }
      }
    },
    "/auth/email/otp/send": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Send email verification OTP",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "email"
                ],
                "properties": {
                  "email": {
                    "type": "string",
                    "format": "email",
                    "example": "customer@example.com"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Email OTP sent",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/ValidationError"
          },
          "409": {
            "description": "Resend cooldown active",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "429": {
            "description": "Rate limited",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "502": {
            "description": "Email delivery failed",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/auth/email/otp/resend": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Resend email verification OTP",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "email"
                ],
                "properties": {
                  "email": {
                    "type": "string",
                    "format": "email",
                    "example": "customer@example.com"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Email OTP resent",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/ValidationError"
          },
          "409": {
            "description": "Resend cooldown active",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "429": {
            "description": "Rate limited",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "502": {
            "description": "Email delivery failed",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/auth/email/otp/verify": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Verify email OTP and issue JWT tokens",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "email",
                  "otp"
                ],
                "properties": {
                  "email": {
                    "type": "string",
                    "format": "email",
                    "example": "customer@example.com"
                  },
                  "otp": {
                    "type": "string",
                    "pattern": "^\\d{6}$",
                    "example": "123456"
                  },
                  "requestId": {
                    "type": "string",
                    "example": "email_otp_00000000-0000-0000-0000-000000000000"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Customer session",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/ValidationError"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "409": {
            "description": "OTP verification locked",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "429": {
            "description": "Rate limited",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/auth/admin/login": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Admin login",
        "responses": {
          "200": {
            "description": "Admin session",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/auth/refresh": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Refresh access token",
        "responses": {
          "200": {
            "description": "New access token",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/auth/logout": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Logout and revoke refresh token",
        "responses": {
          "200": {
            "description": "Revoked",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/me/account-deletion": {
      "get": {
        "tags": [
          "User"
        ],
        "summary": "Get current customer's account deletion status",
        "responses": {
          "200": {
            "description": "Account deletion status",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "User"
        ],
        "summary": "Request current customer account deletion",
        "responses": {
          "201": {
            "description": "Account deletion requested",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "User"
        ],
        "summary": "Cancel current customer account deletion request",
        "responses": {
          "200": {
            "description": "Account deletion request cancelled",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/users": {
      "get": {
        "tags": [
          "User"
        ],
        "summary": "List users",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "User"
        ],
        "summary": "Create users",
        "responses": {
          "201": {
            "description": "Created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/users/{id}": {
      "get": {
        "tags": [
          "User"
        ],
        "summary": "Get users by id",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "patch": {
        "tags": [
          "User"
        ],
        "summary": "Update users",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "User"
        ],
        "summary": "Soft delete users",
        "responses": {
          "204": {
            "description": "Deleted",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/admins": {
      "get": {
        "tags": [
          "Admin Access"
        ],
        "summary": "List admin operators",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/admins/invite": {
      "post": {
        "tags": [
          "Admin Access"
        ],
        "summary": "Invite or create an admin operator",
        "responses": {
          "201": {
            "description": "Created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/admins/{id}": {
      "patch": {
        "tags": [
          "Admin Access"
        ],
        "summary": "Update an admin operator",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Admin Access"
        ],
        "summary": "Deactivate an admin operator",
        "responses": {
          "200": {
            "description": "Deactivated",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/admins/{id}/permissions": {
      "patch": {
        "tags": [
          "Admin Access"
        ],
        "summary": "Update admin permissions",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/admins/{id}/reset-password": {
      "post": {
        "tags": [
          "Admin Access"
        ],
        "summary": "Reset an admin password",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/admins/{id}/suspend": {
      "post": {
        "tags": [
          "Admin Access"
        ],
        "summary": "Suspend or reactivate an admin operator",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/sales-team": {
      "get": {
        "tags": [
          "Admin Access"
        ],
        "summary": "List active sales team members",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "Admin Access"
        ],
        "summary": "Create a sales team member",
        "responses": {
          "201": {
            "description": "Created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/sales-team/{id}": {
      "patch": {
        "tags": [
          "Admin Access"
        ],
        "summary": "Update a sales team member",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Admin Access"
        ],
        "summary": "Deactivate a sales team member",
        "responses": {
          "200": {
            "description": "Deactivated",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/workflow/{entityType}/{entityId}/logs": {
      "get": {
        "summary": "List workflow communication logs",
        "parameters": [
          {
            "name": "entityType",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "entityId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "channel",
            "in": "query",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Workflow logs",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "Create workflow communication log",
        "parameters": [
          {
            "name": "entityType",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "entityId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "201": {
            "description": "Workflow log created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/workflow/{entityType}/{entityId}/push": {
      "post": {
        "summary": "Queue or log an admin-triggered push notification",
        "parameters": [
          {
            "name": "entityType",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "entityId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "201": {
            "description": "Push logged",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/workflow/{entityType}/{entityId}/proofs": {
      "post": {
        "summary": "Upload proof file for workflow entity",
        "parameters": [
          {
            "name": "entityType",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "entityId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "properties": {
                  "file": {
                    "type": "string",
                    "format": "binary"
                  },
                  "summary": {
                    "type": "string"
                  },
                  "notes": {
                    "type": "string"
                  }
                },
                "required": [
                  "file"
                ]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Proof uploaded and logged",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/ValidationError"
          }
        }
      }
    },
    "/admin/workflow/logs/{logId}": {
      "delete": {
        "summary": "Delete workflow communication log",
        "parameters": [
          {
            "name": "logId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Workflow log deleted",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/properties": {
      "get": {
        "tags": [
          "Property"
        ],
        "summary": "List properties",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "Property"
        ],
        "summary": "Create properties",
        "responses": {
          "201": {
            "description": "Created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/properties/{id}": {
      "get": {
        "tags": [
          "Property"
        ],
        "summary": "Get properties by id",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "patch": {
        "tags": [
          "Property"
        ],
        "summary": "Update properties",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Property"
        ],
        "summary": "Soft delete properties",
        "responses": {
          "204": {
            "description": "Deleted",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/properties/import-jobs": {
      "get": {
        "tags": [
          "Property"
        ],
        "summary": "List property import jobs with row errors and imported property summaries",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/import-jobs/{id}": {
      "get": {
        "tags": [
          "Property"
        ],
        "summary": "Get a property import job",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/import-jobs/{id}/undo": {
      "post": {
        "tags": [
          "Property"
        ],
        "summary": "Revert a completed property import by soft-deleting imported properties",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/ValidationError"
          },
          "404": {
            "description": "Not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/buyEnquiries": {
      "get": {
        "tags": [
          "BuyEnquiry"
        ],
        "summary": "List buyEnquiries",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "BuyEnquiry"
        ],
        "summary": "Create buyEnquiries",
        "responses": {
          "201": {
            "description": "Created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/buyEnquiries/{id}": {
      "get": {
        "tags": [
          "BuyEnquiry"
        ],
        "summary": "Get buyEnquiries by id",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "patch": {
        "tags": [
          "BuyEnquiry"
        ],
        "summary": "Update buyEnquiries",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "BuyEnquiry"
        ],
        "summary": "Soft delete buyEnquiries",
        "responses": {
          "204": {
            "description": "Deleted",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/sellRequests": {
      "get": {
        "tags": [
          "SellRequest"
        ],
        "summary": "List sellRequests",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "SellRequest"
        ],
        "summary": "Create sellRequests",
        "responses": {
          "201": {
            "description": "Created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/sellRequests/{id}": {
      "get": {
        "tags": [
          "SellRequest"
        ],
        "summary": "Get sellRequests by id",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "patch": {
        "tags": [
          "SellRequest"
        ],
        "summary": "Update sellRequests",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "SellRequest"
        ],
        "summary": "Soft delete sellRequests",
        "responses": {
          "204": {
            "description": "Deleted",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/me/sell-requests/{sellRequestId}/activity": {
      "get": {
        "tags": [
          "SellRequest"
        ],
        "summary": "Get seller listing activity, offer, payout, visit, enquiry, chat, and registration state",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/me/sell-requests/{sellRequestId}/offer-decision": {
      "post": {
        "tags": [
          "SellRequest"
        ],
        "summary": "Accept or counter a seller offer",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/me/sell-requests/{sellRequestId}/messages": {
      "post": {
        "tags": [
          "SellRequest"
        ],
        "summary": "Send a seller negotiation message",
        "responses": {
          "201": {
            "description": "Created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/me/sell-requests/{sellRequestId}/visits/{visitId}/action": {
      "post": {
        "tags": [
          "SellRequest"
        ],
        "summary": "Confirm or reschedule a seller listing visit",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/acquisitions": {
      "get": {
        "tags": [
          "Acquisition"
        ],
        "summary": "List acquisitions",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "Acquisition"
        ],
        "summary": "Create acquisitions",
        "responses": {
          "201": {
            "description": "Created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/acquisitions/{id}": {
      "get": {
        "tags": [
          "Acquisition"
        ],
        "summary": "Get acquisitions by id",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "patch": {
        "tags": [
          "Acquisition"
        ],
        "summary": "Update acquisitions",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Acquisition"
        ],
        "summary": "Soft delete acquisitions",
        "responses": {
          "204": {
            "description": "Deleted",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/salesDeals": {
      "get": {
        "tags": [
          "SalesDeal"
        ],
        "summary": "List salesDeals",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "SalesDeal"
        ],
        "summary": "Create salesDeals",
        "responses": {
          "201": {
            "description": "Created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/salesDeals/{id}": {
      "get": {
        "tags": [
          "SalesDeal"
        ],
        "summary": "Get salesDeals by id",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "patch": {
        "tags": [
          "SalesDeal"
        ],
        "summary": "Update salesDeals",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "SalesDeal"
        ],
        "summary": "Soft delete salesDeals",
        "responses": {
          "204": {
            "description": "Deleted",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/visits/availability": {
      "get": {
        "tags": [
          "Visit"
        ],
        "summary": "Get available visit slots",
        "parameters": [
          {
            "in": "query",
            "name": "propertyId",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "in": "query",
            "name": "visitType",
            "schema": {
              "type": "string",
              "enum": [
                "physical",
                "virtual"
              ],
              "default": "physical"
            }
          },
          {
            "in": "query",
            "name": "from",
            "schema": {
              "type": "string",
              "format": "date"
            }
          },
          {
            "in": "query",
            "name": "days",
            "schema": {
              "type": "integer",
              "minimum": 1,
              "maximum": 30,
              "default": 7
            }
          }
        ],
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/visits": {
      "get": {
        "tags": [
          "Visit"
        ],
        "summary": "List visits",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "Visit"
        ],
        "summary": "Create visits",
        "responses": {
          "201": {
            "description": "Created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/visits/{id}": {
      "get": {
        "tags": [
          "Visit"
        ],
        "summary": "Get visits by id",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "patch": {
        "tags": [
          "Visit"
        ],
        "summary": "Update visits",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Visit"
        ],
        "summary": "Soft delete visits",
        "responses": {
          "204": {
            "description": "Deleted",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/callbacks": {
      "get": {
        "tags": [
          "Callback"
        ],
        "summary": "List callbacks",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "Callback"
        ],
        "summary": "Create callbacks",
        "responses": {
          "201": {
            "description": "Created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/callbacks/{id}": {
      "get": {
        "tags": [
          "Callback"
        ],
        "summary": "Get callbacks by id",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "patch": {
        "tags": [
          "Callback"
        ],
        "summary": "Update callbacks",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Callback"
        ],
        "summary": "Soft delete callbacks",
        "responses": {
          "204": {
            "description": "Deleted",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/chatThreads": {
      "get": {
        "tags": [
          "ChatThread"
        ],
        "summary": "List chatThreads",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "ChatThread"
        ],
        "summary": "Create chatThreads",
        "responses": {
          "201": {
            "description": "Created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/chatThreads/{id}": {
      "get": {
        "tags": [
          "ChatThread"
        ],
        "summary": "Get chatThreads by id",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "patch": {
        "tags": [
          "ChatThread"
        ],
        "summary": "Update chatThreads",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "ChatThread"
        ],
        "summary": "Soft delete chatThreads",
        "responses": {
          "204": {
            "description": "Deleted",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/interiorLeads": {
      "get": {
        "tags": [
          "InteriorLead"
        ],
        "summary": "List interiorLeads",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "InteriorLead"
        ],
        "summary": "Create interiorLeads",
        "responses": {
          "201": {
            "description": "Created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/interiorLeads/{id}": {
      "get": {
        "tags": [
          "InteriorLead"
        ],
        "summary": "Get interiorLeads by id",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "patch": {
        "tags": [
          "InteriorLead"
        ],
        "summary": "Update interiorLeads",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "InteriorLead"
        ],
        "summary": "Soft delete interiorLeads",
        "responses": {
          "204": {
            "description": "Deleted",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/supportTickets": {
      "get": {
        "tags": [
          "SupportTicket"
        ],
        "summary": "List supportTickets",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "SupportTicket"
        ],
        "summary": "Create supportTickets",
        "responses": {
          "201": {
            "description": "Created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/supportTickets/{id}": {
      "get": {
        "tags": [
          "SupportTicket"
        ],
        "summary": "Get supportTickets by id",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "patch": {
        "tags": [
          "SupportTicket"
        ],
        "summary": "Update supportTickets",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "SupportTicket"
        ],
        "summary": "Soft delete supportTickets",
        "responses": {
          "204": {
            "description": "Deleted",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/payments": {
      "get": {
        "tags": [
          "Payment"
        ],
        "summary": "List payments",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "Payment"
        ],
        "summary": "Create payments",
        "responses": {
          "201": {
            "description": "Created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/payments/{id}": {
      "get": {
        "tags": [
          "Payment"
        ],
        "summary": "Get payments by id",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "patch": {
        "tags": [
          "Payment"
        ],
        "summary": "Update payments",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Payment"
        ],
        "summary": "Soft delete payments",
        "responses": {
          "204": {
            "description": "Deleted",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/documents": {
      "get": {
        "tags": [
          "Document"
        ],
        "summary": "List documents",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "Document"
        ],
        "summary": "Create documents",
        "responses": {
          "201": {
            "description": "Created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/documents/{id}": {
      "get": {
        "tags": [
          "Document"
        ],
        "summary": "Get documents by id",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "patch": {
        "tags": [
          "Document"
        ],
        "summary": "Update documents",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Document"
        ],
        "summary": "Soft delete documents",
        "responses": {
          "204": {
            "description": "Deleted",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/notifications": {
      "get": {
        "tags": [
          "Notification"
        ],
        "summary": "List notifications",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "Notification"
        ],
        "summary": "Create notifications",
        "responses": {
          "201": {
            "description": "Created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/notifications/{id}": {
      "get": {
        "tags": [
          "Notification"
        ],
        "summary": "Get notifications by id",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "patch": {
        "tags": [
          "Notification"
        ],
        "summary": "Update notifications",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Notification"
        ],
        "summary": "Soft delete notifications",
        "responses": {
          "204": {
            "description": "Deleted",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/auditLogs": {
      "get": {
        "tags": [
          "AuditLog"
        ],
        "summary": "List auditLogs",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "AuditLog"
        ],
        "summary": "Create auditLogs",
        "responses": {
          "201": {
            "description": "Created",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/auditLogs/{id}": {
      "get": {
        "tags": [
          "AuditLog"
        ],
        "summary": "Get auditLogs by id",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "404": {
            "description": "Not found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "error": {
                        "code": "ERROR",
                        "message": "Request failed",
                        "details": []
                      },
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "patch": {
        "tags": [
          "AuditLog"
        ],
        "summary": "Update auditLogs",
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "AuditLog"
        ],
        "summary": "Soft delete auditLogs",
        "responses": {
          "204": {
            "description": "Deleted",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/admin/overview": {
      "get": {
        "tags": [
          "Reports"
        ],
        "summary": "Dashboard overview",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "KPI cards, schedule, recent activities, and pipeline counts",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "403": {
            "$ref": "#/components/responses/Forbidden"
          }
        }
      }
    },
    "/admin/reports/summary": {
      "get": {
        "tags": [
          "Reports"
        ],
        "summary": "Reports summary",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "from",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "to",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Aggregated report metrics",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "403": {
            "$ref": "#/components/responses/Forbidden"
          }
        }
      }
    },
    "/admin/reports/sales/analytics": {
      "get": {
        "tags": [
          "Reports"
        ],
        "summary": "Sales analytics aggregates",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "from",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "to",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "propertyType",
            "in": "query",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Sales KPIs, monthly buckets, revenue mix, and property comparison rows",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "403": {
            "$ref": "#/components/responses/Forbidden"
          }
        }
      }
    },
    "/admin/reports/acquisition/analytics": {
      "get": {
        "tags": [
          "Reports"
        ],
        "summary": "Acquisition analytics aggregates",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "from",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "to",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "propertyType",
            "in": "query",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Acquisition KPIs, stage counts, and property-type mix",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "403": {
            "$ref": "#/components/responses/Forbidden"
          }
        }
      }
    },
    "/admin/reports/revenue/analytics": {
      "get": {
        "tags": [
          "Reports"
        ],
        "summary": "Revenue analytics aggregates",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "from",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "to",
            "in": "query",
            "schema": {
              "type": "string",
              "format": "date-time"
            }
          },
          {
            "name": "propertyType",
            "in": "query",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Revenue, cost, profit, monthly ledger, and payment aging aggregates",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "403": {
            "$ref": "#/components/responses/Forbidden"
          }
        }
      }
    },
    "/admin/reports/export": {
      "post": {
        "tags": [
          "Reports"
        ],
        "summary": "Create report export",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "201": {
            "description": "Queued report export request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "403": {
            "$ref": "#/components/responses/Forbidden"
          }
        }
      }
    },
    "/admin/reports/exports": {
      "get": {
        "tags": [
          "Reports"
        ],
        "summary": "List report export jobs",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "Paginated export job history",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "403": {
            "$ref": "#/components/responses/Forbidden"
          }
        }
      }
    },
    "/admin/reports/exports/{id}": {
      "get": {
        "tags": [
          "Reports"
        ],
        "summary": "Get report export job status",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Export job status and metadata",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "403": {
            "$ref": "#/components/responses/Forbidden"
          }
        }
      }
    },
    "/admin/reports/exports/{id}/download-url": {
      "get": {
        "tags": [
          "Reports"
        ],
        "summary": "Create report export download URL",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Expiring download URL for completed export",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "403": {
            "$ref": "#/components/responses/Forbidden"
          }
        }
      }
    },
    "/admin/reports/exports/{id}/download": {
      "get": {
        "tags": [
          "Reports"
        ],
        "summary": "Download report export artifact",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "token",
            "in": "query",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Generated export file",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessEnvelope"
                },
                "examples": {
                  "default": {
                    "value": {
                      "data": {},
                      "meta": {
                        "requestId": "req_example"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    },
    "schemas": {
      "Meta": {
        "type": "object",
        "properties": {
          "requestId": {
            "type": "string"
          },
          "page": {
            "type": "integer"
          },
          "limit": {
            "type": "integer"
          },
          "total": {
            "type": "integer"
          },
          "totalPages": {
            "type": "integer"
          }
        }
      },
      "ErrorDetail": {
        "type": "object",
        "properties": {
          "field": {
            "type": "string"
          },
          "message": {
            "type": "string"
          }
        }
      },
      "ErrorEnvelope": {
        "type": "object",
        "required": [
          "error",
          "meta"
        ],
        "properties": {
          "error": {
            "type": "object",
            "required": [
              "code",
              "message",
              "details"
            ],
            "properties": {
              "code": {
                "type": "string"
              },
              "message": {
                "type": "string"
              },
              "details": {
                "type": "array",
                "items": {
                  "$ref": "#/components/schemas/ErrorDetail"
                }
              }
            }
          },
          "meta": {
            "$ref": "#/components/schemas/Meta"
          }
        }
      },
      "SuccessEnvelope": {
        "type": "object",
        "required": [
          "data",
          "meta"
        ],
        "properties": {
          "data": {},
          "meta": {
            "$ref": "#/components/schemas/Meta"
          }
        }
      },
      "Reference": {
        "type": "object",
        "properties": {
          "_id": {
            "type": "string"
          },
          "referenceId": {
            "type": "string"
          },
          "createdAt": {
            "type": "string",
            "format": "date-time"
          },
          "updatedAt": {
            "type": "string",
            "format": "date-time"
          }
        }
      },
      "AuthTokens": {
        "type": "object",
        "properties": {
          "accessToken": {
            "type": "string"
          },
          "refreshToken": {
            "type": "string"
          },
          "expiresInSeconds": {
            "type": "integer"
          }
        }
      },
      "Property": {
        "allOf": [
          {
            "$ref": "#/components/schemas/Reference"
          },
          {
            "type": "object",
            "properties": {
              "title": {
                "type": "string"
              },
              "type": {
                "type": "string"
              },
              "status": {
                "type": "string"
              },
              "price": {
                "type": "number"
              },
              "address": {
                "type": "object"
              },
              "media": {
                "type": "object"
              }
            }
          }
        ]
      },
      "User": {
        "allOf": [
          {
            "$ref": "#/components/schemas/Reference"
          },
          {
            "type": "object",
            "properties": {
              "phone": {
                "type": "string"
              },
              "role": {
                "type": "string"
              },
              "userType": {
                "type": "string"
              },
              "kycStatus": {
                "type": "string"
              },
              "femaCompliance": {
                "type": "object"
              }
            }
          }
        ]
      },
      "Payment": {
        "allOf": [
          {
            "$ref": "#/components/schemas/Reference"
          },
          {
            "type": "object",
            "properties": {
              "amount": {
                "type": "number"
              },
              "currency": {
                "type": "string"
              },
              "status": {
                "type": "string"
              },
              "providerEventId": {
                "type": "string"
              }
            }
          }
        ]
      },
      "Notification": {
        "allOf": [
          {
            "$ref": "#/components/schemas/Reference"
          },
          {
            "type": "object",
            "properties": {
              "event": {
                "type": "string"
              },
              "channel": {
                "type": "string"
              },
              "status": {
                "type": "string"
              },
              "attempts": {
                "type": "integer"
              },
              "maxAttempts": {
                "type": "integer"
              }
            }
          }
        ]
      },
      "ReportSummary": {
        "type": "object",
        "properties": {
          "funnel": {
            "type": "object"
          },
          "stageAging": {
            "type": "object"
          },
          "revenueByType": {
            "type": "array",
            "items": {
              "type": "object"
            }
          },
          "buyerReport": {
            "type": "object"
          },
          "sellerReport": {
            "type": "object"
          }
        }
      }
    },
    "responses": {
      "Unauthorized": {
        "description": "Unauthorized",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorEnvelope"
            }
          }
        }
      },
      "Forbidden": {
        "description": "Forbidden",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorEnvelope"
            }
          }
        }
      },
      "ValidationError": {
        "description": "Validation failed",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorEnvelope"
            }
          }
        }
      }
    }
  }
};
