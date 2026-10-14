// The communities Rachel works with. To add one, copy a line and change the fields.
// reader: which website type it runs on (jonah, rentcafe, leaseleads, amli, repli360, gables, generic).
// blocked: true = the site blocks automated visitors, so we don't visit it.
// address: street address, used to place the building on the map.
// priceType: "total" = base rent + required monthly fees; "from" = advertised starting rent.
export const COMMUNITIES = [
  { id: "alexan",   name: "Alexan Waterloo", address: "700 E 11th St, Austin, TX",         area: "Downtown · Waterloo Park",      reader: "jonah",      priceType: "total", url: "https://alexanwaterloo.com/floorplans/" },
  { id: "river",    name: "700 River", address: "700 River St, Austin, TX",               area: "Rainey Street",                 reader: "jonah",      priceType: "total", url: "https://700river.com/floorplans/" },
  { id: "bowie",    name: "The Bowie", address: "311 Bowie St, Austin, TX",               area: "Market District",               reader: "jonah",      priceType: "from",  url: "https://liveatbowie.com/floorplans/" },
  { id: "quincy",   name: "The Quincy", address: "91 Red River St, Austin, TX",              area: "Rainey Street",                 reader: "jonah",      priceType: "total", url: "https://quincyatx.com/floorplans/" },
  { id: "skyline",  name: "Skyline at Barton Creek", address: "1300 Spyglass Dr, Austin, TX", area: "Barton Hills",                  reader: "rentcafe",   priceType: "from",  url: "https://www.skylineatbartoncreek.com/floorplans", blocked: true },
  { id: "colorado", name: "415 Colorado", address: "415 Colorado St, Austin, TX",            area: "Downtown",                      reader: "leaseleads", priceType: "from",  url: "https://www.415colorado.com/floor-plans/" },
  { id: "a2nd",     name: "AMLI on 2ND", address: "421 W 3rd St, Austin, TX",             area: "2nd Street District",           reader: "amli",       priceType: "total", url: "https://www.amli.com/apartments/austin/2nd-street-district-apartments/amli-on-2nd/floorplans" },
  { id: "a300",     name: "AMLI 300", address: "300 N Lamar Blvd, Austin, TX",                area: "Clarksville · West Downtown",   reader: "amli",       priceType: "total", url: "https://www.amli.com/apartments/austin/downtown-austin-apartments/amli-300/floorplans" },
  { id: "ass",      name: "AMLI South Shore", address: "1620 E Riverside Dr, Austin, TX",        area: "East Riverside · Lady Bird Lake", reader: "amli",     priceType: "total", url: "https://www.amli.com/apartments/austin/downtown-austin-apartments/amli-south-shore/floorplans" },
  { id: "adt",      name: "AMLI Downtown", address: "201 Lavaca St, Austin, TX",           area: "2nd Street District",           reader: "amli",       priceType: "total", url: "https://www.amli.com/apartments/austin/2nd-street-district-apartments/amli-downtown/floorplans" },
  { id: "gables",   name: "Gables Park Plaza", address: "115 Sandra Muraida Way, Austin, TX",       area: "Downtown · Seaholm",            reader: "gables",     priceType: "total", url: "https://www.gables.com/community/528470" },
  { id: "hanover",  name: "Hanover Brazos Street", address: "215 Brazos St, Austin, TX",   area: "Downtown",                      reader: "generic",    priceType: "from",  url: "https://www.hanoverbrazos.com/austin/hanover-brazos-street/conventional/", blocked: true },
  { id: "clark",    name: "The Clark", address: "1301 W 5th St, Austin, TX",               area: "West End · Clarksville",        reader: "repli360",   priceType: "total", url: "https://www.theclarkaustin.com/floor-plans" },
  // Added Oct 14, 2026 (downtown research)
  { id: "waller",      name: "The Waller", address: "1104 Sabine St, Austin, TX",              area: "Downtown · Waterloo",          reader: "greystar",   priceType: "total", url: "https://www.greystar.com/properties/austin-tx/the-waller/floorplans" },
  { id: "rio404",      name: "404 Rio Grande", address: "404 Rio Grande St, Austin, TX",          area: "West Downtown",                reader: "jonah",      priceType: "total", url: "https://www.404riogrande.com/floorplans/" },
  { id: "elle",        name: "Elle West Ave", address: "300 West Ave, Austin, TX",           area: "West Downtown",                reader: "jonah",      priceType: "total", url: "https://www.ellewestave.com/floorplans/" },
  { id: "northshore",  name: "Northshore", address: "110 San Antonio St, Austin, TX",              area: "Downtown · Lakefront",         reader: "jonah",      priceType: "total", url: "https://www.northshoreaustin.com/floorplans/" },
  { id: "monarch",     name: "The Monarch by Windsor", address: "801 W 5th St, Austin, TX",  area: "Market District · West 5th",   reader: "windsor",    priceType: "total", url: "https://www.windsorcommunities.com/properties/the-monarch-by-windsor/floorplans/" },
  { id: "windsorlake", name: "Windsor on the Lake", address: "43 Rainey St, Austin, TX",     area: "Rainey Street",                reader: "windsor",    priceType: "total", url: "https://www.windsorcommunities.com/properties/windsor-on-the-lake/floorplans/" },
  { id: "gablesrs",    name: "Gables Republic Square", address: "401 Guadalupe St, Austin, TX",  area: "Warehouse District",           reader: "gables",     priceType: "total", url: "https://www.gables.com/community/1104750" },
  { id: "gablestower", name: "Gables Park Tower", address: "111 Sandra Muraida Way, Austin, TX",       area: "Downtown · Seaholm",           reader: "gables",     priceType: "total", url: "https://www.gables.com/community/528448" },
  { id: "corazon",     name: "Corazon", address: "1000 E 5th St, Austin, TX",                 area: "East Downtown",                reader: "g5",         priceType: "total", url: "https://www.corazonatxapartments.com/apartments/tx/austin/floor-plans" },
  // Checked by hand (sites block automated visitors)
  { id: "saltillo",    name: "Residences at Saltillo", address: "1211 E 5th St, Austin, TX",  area: "East Downtown · Plaza Saltillo", manual: true, priceType: "total", url: "https://residencesatsaltillo.securecafe.com/onlineleasing/residences-at-saltillo/floorplans.aspx", note: "2 beds seen from $2,286" },
  { id: "skyhouse",    name: "SkyHouse Austin", address: "51 Rainey St, Austin, TX",         area: "Rainey Street",                manual: true, priceType: "total", url: "https://www.simpsonpropertygroup.com/apartments/austin-texas/skyhouse-austin-rainey-street-downtown/apartment-floor-plans", note: "2 beds seen from $3,136" },
];
