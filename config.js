// Configuration for GrindCTRL vanilla storefront
//
// This file centralizes site settings so you can adjust things like
// webhook endpoints and feature flags without touching the HTML or
// application logic.  Edit the values below to suit your deployment.

window.CONFIG = {
  // The webhook URL that receives order data on checkout.  Leave blank
  // or set to your n8n or backend endpoint.  For local testing
  // you can use a service like webhook.site.
  WEBHOOK_URL: 'https://grindctrlface.app.n8n.cloud/webhook/test2git',

  // When a customer submits a return request the payload will be sent to
  // this endpoint.  Update this to point at your n8n return workflow.
  RETURN_WEBHOOK_URL: 'https://grindctrlface.app.n8n.cloud/webhook/returnxx',

  // When a customer submits an exchange request the payload will be sent to
  // this endpoint.  Update this to point at your n8n exchange workflow.
  EXCHANGE_WEBHOOK_URL: 'https://grindctrlface.app.n8n.cloud/webhook/exxx',

  // API endpoints for ancillary features.  These aren’t used in the
  // current static implementation but are here for future integration.
  API_ENDPOINTS: {
    NEWSLETTER: '/api/newsletter',
    CONTACT: '/api/contact'
  },

  SETTINGS: {
    CART_PERSISTENCE: true,
    WISHLIST_PERSISTENCE: true,
    ANIMATIONS_ENABLED: true,
    LAZY_LOADING: true
  }
};
