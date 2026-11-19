import type { ClientConfig } from './types';

// Burke AllTrade Services, Mike Burke, solo handyman, Bergen County NJ.
// Referral driven. Goal: from under 5 jobs a week to 10+.
// Tune voice.examples with real texts Mike has sent. That is the single biggest lever on draft quality.

const burke: ClientConfig = {
  id: 'burke',
  appName: 'AllTrade Command',
  business: {
    name: 'Burke AllTrade Services',
    owner: 'Mike Burke',
    ownerFirst: 'Mike',
    phone: '201-749-1531',
    email: 'mike@burkealltradehandyman.com',
    serviceArea: 'Bergen County, NJ',
    reviewUrl: '',
    paymentInstructions: 'Zelle, Venmo, check, or cash all work.',
  },
  pricing: {
    hourlyRate: 95,
    minimumCharge: 190,
    minimumLabel: 'Minimum service call (covers first 2 hours on site)',
    tripCharge: 0,
    materialsMarkupPct: 15,
    roundTo: 5,
    bundleSuggestions: [
      'Caulk the tub or shower while I am there',
      'Swap smoke and CO detector batteries',
      'Tighten loose cabinet doors and hinges',
      'Hang pictures, mirrors, or TV',
      'Fix sticking doors or loose door knobs',
      'Replace a light fixture or two',
      'Patch small drywall holes',
      'Adjust or lube the garage door',
    ],
  },
  voice: {
    description:
      'Friendly local guy from Bergen County. Short, warm, straight to the point. Sounds like a text from a neighbor who happens to be handy, never like a company. Uses first names. Light, never pushy.',
    signOff: '- Mike',
    doSay: ['Hey {first}', 'no rush', 'happy to', 'whenever works', 'appreciate you'],
    neverSay: [
      'Dear',
      'valued customer',
      'circling back',
      'touching base',
      'hope this finds you well',
      'at your earliest convenience',
      'per my last',
      'kindly',
      'leverage',
    ],
    examples: [
      'Hey Linda, Mike here. Just wanted to make sure the vanity is holding up good. Anything else on the list, let me know.',
      'Hey Tom, thanks again for having me out. If you know anyone who needs a hand around the house I would really appreciate the referral. - Mike',
      'Hi Maria, quick one on the quote I sent for the doors. Any questions, happy to walk through it. No rush.',
    ],
  },
  buckets: [
    {
      id: 'unpaid',
      label: 'Unpaid job',
      priority: 1,
      enabled: true,
      afterDays: 2,
      repeatEveryDays: 5,
      maxTouches: 3,
      template:
        'Hey {first}, Mike here. Just a friendly reminder on the {job}, balance is ${amount}. Zelle, Venmo, check, or cash all work. Thanks again! - Mike',
      intent:
        'Polite payment nudge. Assume they forgot, never accusatory. Mention the amount and that Zelle, Venmo, check or cash all work.',
    },
    {
      id: 'stale_quote',
      label: 'Open quote',
      priority: 2,
      enabled: true,
      afterDays: 3,
      repeatEveryDays: 4,
      maxTouches: 2,
      template:
        'Hey {first}, Mike here. Wanted to check in on the quote for the {job}. Any questions or want to get it on the calendar? No rush. - Mike',
      intent:
        'Check in on an open quote. Offer to answer questions or get it scheduled. Low pressure, one easy question to reply to.',
    },
    {
      id: 'referral_thanks',
      label: 'Referral thank-you',
      priority: 3,
      enabled: true,
      afterDays: 3,
      maxTouches: 1,
      windowDays: 30,
      template:
        'Hey {first}, Mike here. Thanks again for having me out for the {job}. If you were happy with it, a quick Google review or passing my name to a neighbor would mean a lot. {reviewUrl} - Mike',
      intent:
        'Thank them for the job. Soft ask for a Google review or a referral to a friend or neighbor. Grateful, not salesy. Include the review link if provided.',
    },
    {
      id: 'checkin',
      label: 'Past customer check-in',
      priority: 4,
      enabled: true,
      afterDays: 60,
      repeatEveryDays: 75,
      template:
        'Hey {first}, Mike here. Been a little while since the {job}, hope all is good at the house. If anything is on the honey-do list I have some openings coming up. - Mike',
      intent:
        'Friendly check-in with a past customer 60 to 90 days out. Reference the last job naturally. Mention openings coming up, maybe a seasonal tip relevant to the current month in Bergen County.',
    },
  ],
  followUps: { dailyMax: 5, dailyMin: 3 },
  schedule: {
    defaultDurationMin: 120,
    timezone: 'America/New_York',
    confirmationTemplate:
      'Hey {first}, Mike here. You are all set for {date} at {time} for the {job}. I will text when I am on the way. - Mike',
  },
  paymentMethods: ['Zelle', 'Venmo', 'Check', 'Cash'],
  quote: {
    emailSubject: 'Quote from {business}: {job}',
    terms: [
      'Pricing is good for 30 days.',
      'Materials are estimated and billed at cost plus handling. Anything over estimate gets a call first.',
      'Payment due on completion. Zelle, Venmo, check, or cash.',
    ],
  },
};

export default burke;
