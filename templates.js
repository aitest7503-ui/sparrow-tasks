// Project templates for Sparrow Web Solutions (Amazon SPN). Tasks: [title, dueInDays, priority, clientVisible, milestone]
window.TEMPLATES = [
 { id: 'blank', name: 'Blank project', icon: '➕', color: '#64748b', desc: 'Start from scratch with To do / Doing / Review / Done.',
   sections: [{ name: 'To do', tasks: [] }, { name: 'Doing', tasks: [] }, { name: 'Review', tasks: [] }, { name: 'Done', tasks: [] }] },
 { id: 'onboard', cat: ['Amazon','Operations'], name: 'New Seller Account Onboarding', icon: '🚀', color: '#2563eb', desc: 'Seller Central registration, KYC, tax, shipping & first listings.',
   sections: [
   { name: 'Documents & KYC', tasks: [['Collect GST, PAN, bank & address proof', 1, 'high', 1, 0], ['Create Seller Central account', 2, 'high', 1, 1], ['Video / identity verification call', 4, 'high', 1, 0]] },
   { name: 'Account setup', tasks: [['Tax info & GST settings', 5, 'medium', 0, 0], ['Shipping: Easy Ship / FBA / Self-ship setup', 6, 'medium', 1, 0], ['Return address & business info', 6, 'low', 0, 0]] },
   { name: 'Go live', tasks: [['First 10 listings live', 10, 'high', 1, 1], ['Account health check', 12, 'medium', 0, 0], ['Kick-off report sent to client', 14, 'medium', 1, 1]] }] },
 { id: 'catalog', cat: ['Amazon'], name: 'Product Listing / Catalog Upload', icon: '📦', color: '#f59e0b', desc: 'Keyword research, content, flat-file upload & QC.',
   sections: [
   { name: 'Research', tasks: [['Collect catalog sheet & product images', 1, 'high', 1, 0], ['Keyword research per product', 3, 'high', 0, 0], ['Competitor listing audit', 3, 'medium', 0, 0]] },
   { name: 'Content', tasks: [['Titles, bullets & description', 6, 'high', 1, 0], ['Backend search terms', 6, 'medium', 0, 0], ['Image check (white background, 1000px+)', 7, 'medium', 0, 0]] },
   { name: 'Upload & QC', tasks: [['Flat-file / bulk upload', 8, 'high', 1, 1], ['Fix errors & suppressed listings', 9, 'high', 0, 0], ['Final QC & client sign-off', 10, 'medium', 1, 1]] }] },
 { id: 'aplus', cat: ['Amazon','Ads & Marketing'], name: 'A+ Content & Brand Store', icon: '🎨', color: '#a855f7', desc: 'Brand Registry, A+ modules and Storefront design.',
   sections: [
   { name: 'Brand Registry', tasks: [['Check trademark / Brand Registry status', 1, 'high', 1, 0], ['Collect brand assets (logo, fonts, photos)', 2, 'medium', 1, 0]] },
   { name: 'A+ Content', tasks: [['A+ wireframe for hero ASINs', 4, 'medium', 0, 0], ['Design A+ modules', 7, 'high', 1, 0], ['Client approval of A+ designs', 8, 'medium', 1, 1], ['Publish A+ & check approval', 10, 'high', 1, 1]] },
   { name: 'Brand Store', tasks: [['Storefront page plan', 9, 'medium', 0, 0], ['Design & submit Brand Store', 13, 'high', 1, 1]] }] },
 { id: 'ppc', cat: ['Amazon','Ads & Marketing'], name: 'Amazon PPC Ads Campaign Setup', icon: '📈', color: '#10b981', desc: 'Sponsored Products/Brands structure, launch & optimisation.',
   sections: [
   { name: 'Plan', tasks: [['Budget & ACoS target agreed with client', 1, 'high', 1, 1], ['Keyword & ASIN targeting research', 2, 'high', 0, 0]] },
   { name: 'Launch', tasks: [['Auto campaigns', 3, 'medium', 0, 0], ['Manual exact / phrase campaigns', 3, 'high', 0, 0], ['Sponsored Brands campaign', 5, 'medium', 0, 0], ['Campaigns live – client informed', 5, 'high', 1, 1]] },
   { name: 'Optimise', tasks: [['Week-1 search term report & negatives', 10, 'high', 0, 0], ['Bid optimisation', 14, 'medium', 0, 0], ['Monthly PPC report to client', 30, 'medium', 1, 1]] }] },
 { id: 'health', cat: ['Amazon','Support'], name: 'Account Health / Suspension Reinstatement', icon: '🩺', color: '#ef4444', desc: 'Root-cause, Plan of Action (POA) and appeal tracking.',
   sections: [
   { name: 'Investigate', tasks: [['Read performance notification & policy', 0, 'high', 1, 0], ['Collect invoices / documents', 1, 'high', 1, 0], ['Root cause analysis', 2, 'high', 0, 0]] },
   { name: 'Plan of Action', tasks: [['Draft POA (root cause, fix, prevention)', 3, 'high', 0, 0], ['Client review of POA', 4, 'high', 1, 1], ['Submit appeal', 4, 'high', 1, 1]] },
   { name: 'Follow-up', tasks: [['Track Seller Support replies', 7, 'medium', 0, 0], ['Account reinstated / next steps', 10, 'high', 1, 1]] }] },
 { id: 'monthly', cat: ['Amazon','Operations'], name: 'Monthly Account Management', icon: '🗓️', color: '#0ea5e9', desc: 'Recurring monthly checklist for a managed Amazon account.',
   sections: [
   { name: 'Week 1', tasks: [['Account health & policy check', 2, 'high', 0, 0], ['Inventory & stock planning', 3, 'medium', 0, 0]] },
   { name: 'Week 2-3', tasks: [['Listing optimisation (5 ASINs)', 12, 'medium', 1, 0], ['PPC optimisation', 14, 'medium', 0, 0], ['Reviews & feedback check', 15, 'low', 0, 0]] },
   { name: 'Month end', tasks: [['Sales & ads report', 28, 'high', 1, 1], ['Monthly call with client', 30, 'medium', 1, 1]] }] },
 { id: 'support', cat: ['Support'], name: 'Client Support (Tickets)', icon: '🎧', color: '#1d4ed8', desc: 'Track support work coming from client tickets.',
   sections: [{ name: 'New', tasks: [] }, { name: 'Working', tasks: [['Weekly ticket review', 7, 'medium', 0, 0]] }, { name: 'Waiting on client', tasks: [] }, { name: 'Resolved', tasks: [] }] },
 { id: 'web', cat: ['Ads & Marketing'], name: 'Website / Social Media Project', icon: '🌐', color: '#ec4899', desc: 'Website build or social media management for a client.',
   sections: [
   { name: 'Discovery', tasks: [['Requirements & reference sites', 2, 'high', 1, 0], ['Domain, hosting & logins', 3, 'medium', 1, 0]] },
   { name: 'Design & build', tasks: [['Homepage design', 7, 'high', 1, 1], ['Inner pages', 12, 'medium', 0, 0], ['Content calendar (social)', 5, 'medium', 1, 0]] },
   { name: 'Launch', tasks: [['Testing on mobile', 14, 'medium', 0, 0], ['Go live', 15, 'high', 1, 1], ['Handover & training', 17, 'low', 1, 0]] }] }
];
