export type Game={id:string,date:string,swedishTime:string,home:boolean,opponent:string,arena:string,scout:'Försäsong'|'Hög'|'Normal'};
export const games:Game[]=[
{id:'g1',date:'2026-09-09',swedishTime:'03:00',home:true,opponent:'Spruce Grove Saints',arena:'CRA',scout:'Försäsong'},
{id:'g2',date:'2026-09-12',swedishTime:'03:05',home:false,opponent:'Okotoks Oilers',arena:'Viking Rentals Centre',scout:'Försäsong'},
{id:'g3',date:'2026-09-13',swedishTime:'03:00',home:true,opponent:'Okotoks Oilers',arena:'CRA',scout:'Försäsong'},
{id:'g4',date:'2026-09-19',swedishTime:'03:00',home:false,opponent:'Blackfalds Bulldogs',arena:'Eagle Builders Centre',scout:'Hög'},
{id:'g5',date:'2026-09-20',swedishTime:'03:00',home:true,opponent:'Okotoks Oilers',arena:'CRA',scout:'Hög'},
{id:'g6',date:'2026-09-26',swedishTime:'03:00',home:true,opponent:'Spruce Grove Saints',arena:'CRA',scout:'Hög'}
];
export const teams=[['Brooks Bandits',54,0,0,0],['Spruce Grove Saints',54,0,0,0],['Okotoks Oilers',54,0,0,0],['Blackfalds Bulldogs',54,0,0,0],['Sherwood Park Crusaders',54,0,0,0]];
