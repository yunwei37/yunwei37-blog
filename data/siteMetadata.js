/** @type {import("pliny/config").PlinyConfig } */
const siteMetadata = {
  // Website Configuration
  title: '云微的胡思乱想',
  author: 'Yusheng Zheng',
  headerTitle: 'yunwei37',
  description: 'Personal Website of Yusheng Zheng | yunwei37',
  language: 'en-us',
  theme: 'system', // system, dark or light
  siteUrl: 'https://www.yunwei37.com',
  siteRepo: 'https://github.com/yunwei37/yunwei37-blog',
  siteLogo: `${process.env.BASE_PATH || ''}/static/images/logo.png`,
  socialBanner: `${process.env.BASE_PATH || ''}/static/images/twitter-card.png`,
  locale: 'en-US',
  // set to true if you want a navbar fixed to the top
  stickyNav: false,

  // Social Media Links
  email: 'yunwei356@gmail.com',
  github: 'https://github.com/yunwei37',
  x: 'https://x.com/yunwei37',
  linkedin: 'https://www.linkedin.com/in/yusheng-zheng-611920280',
  reddit: 'https://reddit.com/u/yunwei123',
  mastodon: 'https://mastodon.social/@mastodonuser',
  facebook: 'https://facebook.com',
  youtube: 'https://youtube.com',
  threads: 'https://www.threads.net',
  instagram: 'https://www.instagram.com',
  medium: 'https://medium.com',
  bluesky: 'https://bsky.app/',

  // Personal Profile Configuration (for Hero/Landing page)
  hero: {
    enabled: true,
    showPersonalInfo: true,
    name: 'Yusheng Zheng',
    chineseName: '云微',
    title: 'PhD Student & Open Source Developer',
    tagline: 'Curious developer who finds joy in building and exploring',
    description: 'Passionate about computer systems, programming languages, and large language models (LLMs). Creator of eunomia-bpf organization.',
    avatar: '/static/images/avatar.png',
    status: '🏠 Working from home',
    location: 'SF',
    organization: {
      name: 'eunomia-bpf',
      url: 'https://github.com/eunomia-bpf'
    },
    
    // Interests/Skills
    interests: [
      { icon: '🖥', text: 'Computer Systems' },
      { icon: '🧠', text: 'Large Language Models' }, 
      { icon: '🔧', text: 'eBPF & System Programming' },
      { icon: '☁️', text: 'Cloud Native Technologies' },
      { icon: '🌐', text: 'WebAssembly' }
    ],

    // Highlights/Achievements
    highlights: [
      'Creator of eunomia-bpf organization',
      'Open Source Innovation Pioneer Award recipient',
      'OSPP & GSoC mentor/admin (2023, 2024)',
      'OSDI\'25 paper accepted'
    ],

    // Recent Work/Publications
    recentWork: [
      {
        title: 'OSDI\'25 Paper',
        description: '"Extending Applications Safely and Efficiently" Got accepted',
        type: 'publication',
        year: '2025',
        href: 'https://www.usenix.org/conference/osdi25'
      },
      {
        title: 'KubeCon Europe 2025',
        description: '"eBPF and Wasm: Unifying Userspace Extensions With Bpftime"',
        type: 'presentation',
        year: '2025',
        href: 'https://events.linuxfoundation.org/kubecon-cloudnativecon-europe/'
      },
      {
        title: 'eBPF Summit 2024',
        description: '"bpftime: Userspace eBPF Runtime for Network and Observability"',
        type: 'presentation',
        year: '2024',
        href: 'https://ebpf.io/summit-2024/'
      }
    ],

    // Featured Projects
    featuredProjects: [
      {
        name: 'bpftime',
        description: 'Userspace eBPF runtime for Observability, Network, GPU & General Extensions Framework',
        url: 'https://github.com/eunomia-bpf/bpftime',
        stars: '1k',
        language: 'C++',
        featured: true
      },
      {
        name: 'wasm-bpf',
        description: 'WebAssembly library, toolchain and runtime for eBPF programs',
        url: 'https://github.com/eunomia-bpf/wasm-bpf',
        stars: '414',
        language: 'Rust',
        featured: true
      },
      {
        name: 'bpf-developer-tutorial',
        description: 'eBPF Developer Tutorial: Learning eBPF Step by Step with Examples',
        url: 'https://github.com/eunomia-bpf/bpf-developer-tutorial',
        stars: '3.2k',
        language: 'C',
        featured: true
      }
    ],

    // Call to Action buttons
    cta: [
      {
        text: 'Read the Blog',
        href: '/blog',
        primary: true
      },
      {
        text: 'Browse Projects',
        href: 'https://github.com/yunwei37',
        primary: false
      },
      {
        text: 'Google Scholar',
        href: 'https://scholar.google.com/citations?user=bUNH1WAAAAAJ',
        primary: false
      }
    ]
  },

  // Background configuration for anime-style themes
  background: {
    // Choose background type: 'gradient', 'image', or 'video'
    type: 'image',
    // Gradient configurations (when type is 'gradient')
    lightGradient: 'linear-gradient(135deg, rgba(135, 206, 250, 0.3) 0%, rgba(255, 182, 193, 0.2) 25%, rgba(255, 228, 181, 0.3) 50%, rgba(176, 224, 230, 0.2) 75%, rgba(230, 230, 250, 0.3) 100%)',
    darkGradient: 'linear-gradient(135deg, rgba(25, 25, 112, 0.4) 0%, rgba(72, 61, 139, 0.3) 25%, rgba(106, 90, 205, 0.2) 50%, rgba(30, 144, 255, 0.1) 75%, rgba(0, 0, 139, 0.3) 100%)',
    // Image configuration (when type is 'image')
    lightImage: '/background.jpg',
    darkImage: '/background.jpg',
    // Video configuration (when type is 'video')
    lightVideo: '/static/videos/backgrounds/clouds-light.mp4',
    darkVideo: '/static/videos/backgrounds/stars-dark.mp4',
  },
  analytics: {
    // If you want to use an analytics provider you have to add it to the
    // content security policy in the `next.config.js` file.
    // supports Plausible, Simple Analytics, Umami, Posthog or Google Analytics.
    umamiAnalytics: {
      // We use an env variable for this site to avoid other users cloning our analytics ID
      umamiWebsiteId: process.env.NEXT_UMAMI_ID, // e.g. 123e4567-e89b-12d3-a456-426614174000
      // You may also need to overwrite the script if you're storing data in the US - ex:
      // src: 'https://us.umami.is/script.js'
      // Remember to add 'us.umami.is' in `next.config.js` as a permitted domain for the CSP
    },
    // plausibleAnalytics: {
    //   plausibleDataDomain: '', // e.g. tailwind-nextjs-starter-blog.vercel.app
    // If you are hosting your own Plausible.
    //   src: '', // e.g. https://plausible.my-domain.com/js/script.js
    // },
    // simpleAnalytics: {},
    // posthogAnalytics: {
    //   posthogProjectApiKey: '', // e.g. 123e4567-e89b-12d3-a456-426614174000
    // },
    // googleAnalytics: {
    //   googleAnalyticsId: '', // e.g. G-XXXXXXX
    // },
  },
  newsletter: {
    // Newsletter functionality disabled for static site generation
    // supports mailchimp, buttondown, convertkit, klaviyo, revue, emailoctopus, beehive
    // Please add your .env file and modify it according to your selection
    provider: '',
  },
  comments: {
    // If you want to use an analytics provider you have to add it to the
    // content security policy in the `next.config.js` file.
    // Select a provider and use the environment variables associated to it
    // https://vercel.com/docs/environment-variables
    provider: 'giscus', // supported providers: giscus, utterances, disqus
    giscusConfig: {
      // Visit the link below, and follow the steps in the 'configuration' section
      // https://giscus.app/
      repo: process.env.NEXT_PUBLIC_GISCUS_REPO,
      repositoryId: process.env.NEXT_PUBLIC_GISCUS_REPOSITORY_ID,
      category: process.env.NEXT_PUBLIC_GISCUS_CATEGORY,
      categoryId: process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID,
      mapping: 'pathname', // supported options: pathname, url, title
      reactions: '1', // Emoji reactions: 1 = enable / 0 = disable
      // Send discussion metadata periodically to the parent window: 1 = enable / 0 = disable
      metadata: '0',
      // theme example: light, dark, dark_dimmed, dark_high_contrast
      // transparent_dark, preferred_color_scheme, custom
      theme: 'light',
      // theme when dark mode
      darkTheme: 'transparent_dark',
      // If the theme option above is set to 'custom`
      // please provide a link below to your custom theme css file.
      // example: https://giscus.app/themes/custom_example.css
      themeURL: '',
      // This corresponds to the `data-lang="en"` in giscus's configurations
      lang: 'en',
    },
  },
  search: {
    provider: 'kbar', // kbar or algolia
    kbarConfig: {
      searchDocumentsPath: `${process.env.BASE_PATH || ''}/search.json`, // path to load documents to search
    },
    // provider: 'algolia',
    // algoliaConfig: {
    //   // The application ID provided by Algolia
    //   appId: 'R2IYF7ETH7',
    //   // Public API key: it is safe to commit it
    //   apiKey: '599cec31baffa4868cae4e79f180729b',
    //   indexName: 'docsearch',
    // },
  },
}

module.exports = siteMetadata
