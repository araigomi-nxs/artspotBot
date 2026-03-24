# Magma Integration Setup

## Required Environment Variables

Add these to your `.env` file or discloud environment variables:

```env
MAGMA_TOKEN=your_magma_api_token_here
MAGMA_TEAM=your-team-slug-here
```

## How to Get Magma Credentials

1. **MAGMA_TOKEN**:

   - Go to [Magma.com](https://magma.com)
   - Log in to your account
   - Go to Settings → API
   - Generate an API token

2. **MAGMA_TEAM**:
   - This is your team's slug (the URL-friendly name)
   - Found in your team URL: `https://magma.com/t/YOUR-TEAM-SLUG`
   - Example: if your team URL is `https://magma.com/t/artspot-6`, use `artspot-6`

## How to Use

Once configured, users can create Magma canvases with:

```
/create name:"My Drawing" project:[select from dropdown]
```

The bot will:

- Show an autocomplete list of your team's projects
- Create a new drawing canvas in the selected project
- Return a clickable link to the new canvas
