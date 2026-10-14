// The communities Rachel works with. To add one, copy a line and change the fields.
// reader: which website type it runs on (jonah, rentcafe, leaseleads, amli, repli360, gables, generic).
// blocked: true = the site blocks automated visitors, so we don't visit it.
// priceType: "total" = base rent + required monthly fees; "from" = advertised starting rent.
export const COMMUNITIES = [
  { id: "alexan",   name: "Alexan Waterloo",         area: "Downtown · Waterloo Park",      reader: "jonah",      priceType: "total", url: "https://alexanwaterloo.com/floorplans/" },
  { id: "river",    name: "700 River",               area: "Rainey Street",                 reader: "jonah",      priceType: "total", url: "https://700river.com/floorplans/" },
  { id: "bowie",    name: "The Bowie",               area: "Market District",               reader: "jonah",      priceType: "from",  url: "https://liveatbowie.com/floorplans/" },
  { id: "quincy",   name: "The Quincy",              area: "Rainey Street",                 reader: "jonah",      priceType: "total", url: "https://quincyatx.com/floorplans/" },
  { id: "skyline",  name: "Skyline at Barton Creek", area: "Barton Hills",                  reader: "rentcafe",   priceType: "from",  url: "https://www.skylineatbartoncreek.com/floorplans", blocked: true },
  { id: "colorado", name: "415 Colorado",            area: "Downtown",                      reader: "leaseleads", priceType: "from",  url: "https://www.415colorado.com/floor-plans/" },
  { id: "a2nd",     name: "AMLI on 2ND",             area: "2nd Street District",           reader: "amli",       priceType: "total", url: "https://www.amli.com/apartments/austin/2nd-street-district-apartments/amli-on-2nd/floorplans" },
  { id: "a300",     name: "AMLI 300",                area: "Clarksville · West Downtown",   reader: "amli",       priceType: "total", url: "https://www.amli.com/apartments/austin/downtown-austin-apartments/amli-300/floorplans" },
  { id: "ass",      name: "AMLI South Shore",        area: "East Riverside · Lady Bird Lake", reader: "amli",     priceType: "total", url: "https://www.amli.com/apartments/austin/downtown-austin-apartments/amli-south-shore/floorplans" },
  { id: "adt",      name: "AMLI Downtown",           area: "2nd Street District",           reader: "amli",       priceType: "total", url: "https://www.amli.com/apartments/austin/2nd-street-district-apartments/amli-downtown/floorplans" },
  { id: "gables",   name: "Gables Park Plaza",       area: "Downtown · Seaholm",            reader: "gables",     priceType: "total", url: "https://www.gables.com/community/528470" },
  { id: "hanover",  name: "Hanover Brazos Street",   area: "Downtown",                      reader: "generic",    priceType: "from",  url: "https://www.hanoverbrazos.com/austin/hanover-brazos-street/conventional/", blocked: true },
  { id: "clark",    name: "The Clark",               area: "West End · Clarksville",        reader: "repli360",   priceType: "total", url: "https://www.theclarkaustin.com/floor-plans" },
  // Added Oct 14, 2026 (downtown research)
  { id: "waller",      name: "The Waller",              area: "Downtown · Waterloo",          reader: "greystar",   priceType: "total", url: "https://www.greystar.com/properties/austin-tx/the-waller/floorplans" },
  { id: "rio404",      name: "404 Rio Grande",          area: "West Downtown",                reader: "jonah",      priceType: "total", url: "https://www.404riogrande.com/floorplans/" },
  { id: "elle",        name: "Elle West Ave",           area: "West Downtown",                reader: "jonah",      priceType: "total", url: "https://www.ellewestave.com/floorplans/" },
  { id: "northshore",  name: "Northshore",              area: "Downtown · Lakefront",         reader: "jonah",      priceType: "total", url: "https://www.northshoreaustin.com/floorplans/" },
  { id: "monarch",     name: "The Monarch by Windsor",  area: "Market District · West 5th",   reader: "windsor",    priceType: "total", url: "https://www.windsorcommunities.com/properties/the-monarch-by-windsor/floorplans/" },
  { id: "windsorlake", name: "Windsor on the Lake",     area: "Rainey Street",                reader: "windsor",    priceType: "total", url: "https://www.windsorcommunities.com/properties/windsor-on-the-lake/floorplans/" },
  { id: "gablesrs",    name: "Gables Republic Square",  area: "Warehouse District",           reader: "gables",     priceType: "total", url: "https://www.gables.com/community/1104750" },
  { id: "gablestower", name: "Gables Park Tower",       area: "Downtown · Seaholm",           reader: "gables",     priceType: "total", url: "https://www.gables.com/community/528448" },
  { id: "corazon",     name: "Corazon",                 area: "East Downtown",                reader: "g5",         priceType: "total", url: "https://www.corazonatxapartments.com/apartments/tx/austin/floor-plans" },
  // Checked by hand (sites block automated visitors)
  { id: "saltillo",    name: "Residences at Saltillo",  area: "East Downtown · Plaza Saltillo", manual: true, priceType: "total", url: "https://residencesatsaltillo.securecafe.com/onlineleasing/residences-at-saltillo/floorplans.aspx", note: "2 beds seen from $2,286" },
  { id: "skyhouse",    name: "SkyHouse Austin",         area: "Rainey Street",                manual: true, priceType: "total", url: "https://www.simpsonpropertygroup.com/apartments/austin-texas/skyhouse-austin-rainey-street-downtown/apartment-floor-plans", note: "2 beds seen from $3,136" },
];
