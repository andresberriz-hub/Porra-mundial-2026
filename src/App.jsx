// v61 - fix sync race condition, orden equipos por créditos, fix Final +2 (80k, 12 selecciones, límite 1x13k y 1x11k, sobrante = puntos)
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase.js";

// ── Temas de color por porra ─────────────────────────────────────────────
const THEMES = {
  eibar: {
    id:"eibar", name:"Porra Eibar", emoji:"🔴",
    bg:"linear-gradient(160deg,#070714 0%,#0d1520 60%,#14081e 100%)",
    radial:"radial-gradient(ellipse at 15% 40%,rgba(212,175,55,0.07) 0%,transparent 55%)",
    primary:"#d4af37", primaryGrad:"linear-gradient(135deg,#d4af37,#ff6b00)",
    primaryGlow:"rgba(212,175,55,0.35)", accentBorder:"rgba(212,175,55,0.3)",
    btnActive:"linear-gradient(135deg,#d4af37,#ff6b00)", btnActiveTxt:"#000",
    headerBg:"linear-gradient(135deg,rgba(212,175,55,0.15),rgba(255,107,0,0.1))",
    joinBg:"linear-gradient(135deg,#f5c800,#ff8c00)", joinTxt:"#000",
  },
  zumaia: {
    id:"zumaia", name:"Porra Zumaia", emoji:"🔵",
    bg:"linear-gradient(160deg,#03080f 0%,#061525 60%,#081830 100%)",
    radial:"radial-gradient(ellipse at 15% 40%,rgba(56,189,248,0.08) 0%,transparent 55%)",
    primary:"#38bdf8", primaryGrad:"linear-gradient(135deg,#0ea5e9,#0284c7)",
    primaryGlow:"rgba(56,189,248,0.35)", accentBorder:"rgba(56,189,248,0.3)",
    btnActive:"linear-gradient(135deg,#0ea5e9,#0369a1)", btnActiveTxt:"#fff",
    headerBg:"linear-gradient(135deg,rgba(56,189,248,0.15),rgba(2,132,199,0.1))",
    joinBg:"linear-gradient(135deg,#38bdf8,#0ea5e9)", joinTxt:"#000",
  },
};


// Créditos por selección
const KREDITU = {
  // 13k — solo 1 permitido
  "España":13,"Francia":13,"Argentina":13,"Inglaterra":13,
  // 11k — solo 1 permitido
  "Brasil":11,"Marruecos":11,"Alemania":11,"Países Bajos":11,"Bélgica":11,"Portugal":11,
  // 9k
  "México":9,"Estados Unidos":9,"Uruguay":9,"Senegal":9,"Colombia":9,"Croacia":9,
  // 7k
  "Suiza":7,"Turquía":7,"Japón":7,"Irán":7,"Austria":7,
  // 5k
  "Corea del Sur":5,"Australia":5,"Ecuador":5,"Suecia":5,"Egipto":5,"Noruega":5,"Argelia":5,
  // 3k
  "Rep. Checa":3,"Canadá":3,"Escocia":3,"Paraguay":3,"Costa de Marfil":3,"Túnez":3,"Panamá":3,
  // 2k
  "Sudáfrica":2,"Bosnia":2,"Catar":2,"Arabia Saudí":2,"Irak":2,"RD Congo":2,"Uzbekistán":2,
  // 1k
  "Haití":1,"Curazao":1,"Nueva Zelanda":1,"Cabo Verde":1,"Jordania":1,"Ghana":1,
};
const MAX_KREDITU = 80;
const kOf = t => KREDITU[t] || 0;

const FLAGS = {
  "México":"🇲🇽","Sudáfrica":"🇿🇦","Corea del Sur":"🇰🇷","Rep. Checa":"🇨🇿",
  "Canadá":"🇨🇦","Bosnia":"🇧🇦","Catar":"🇶🇦","Suiza":"🇨🇭",
  "Brasil":"🇧🇷","Marruecos":"🇲🇦","Haití":"🇭🇹","Escocia":"🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Estados Unidos":"🇺🇸","Paraguay":"🇵🇾","Australia":"🇦🇺","Turquía":"🇹🇷",
  "Alemania":"🇩🇪","Curazao":"🇨🇼","Costa de Marfil":"🇨🇮","Ecuador":"🇪🇨",
  "Países Bajos":"🇳🇱","Japón":"🇯🇵","Suecia":"🇸🇪","Túnez":"🇹🇳",
  "Bélgica":"🇧🇪","Egipto":"🇪🇬","Irán":"🇮🇷","Nueva Zelanda":"🇳🇿",
  "España":"🇪🇸","Cabo Verde":"🇨🇻","Arabia Saudí":"🇸🇦","Uruguay":"🇺🇾",
  "Francia":"🇫🇷","Senegal":"🇸🇳","Irak":"🇮🇶","Noruega":"🇳🇴",
  "Argentina":"🇦🇷","Argelia":"🇩🇿","Austria":"🇦🇹","Jordania":"🇯🇴",
  "Portugal":"🇵🇹","RD Congo":"🇨🇩","Uzbekistán":"🇺🇿","Colombia":"🇨🇴",
  "Inglaterra":"🏴󠁧󠁢󠁥󠁮󠁧󠁿","Croacia":"🇭🇷","Ghana":"🇬🇭","Panamá":"🇵🇦"
};
const flag = t => FLAGS[t] || "🏳️";

const TEAMS = [
  "México","Sudáfrica","Corea del Sur","Rep. Checa",
  "Canadá","Bosnia","Catar","Suiza",
  "Brasil","Marruecos","Haití","Escocia",
  "Estados Unidos","Paraguay","Australia","Turquía",
  "Alemania","Curazao","Costa de Marfil","Ecuador",
  "Países Bajos","Japón","Suecia","Túnez",
  "Bélgica","Egipto","Irán","Nueva Zelanda",
  "España","Cabo Verde","Arabia Saudí","Uruguay",
  "Francia","Senegal","Irak","Noruega",
  "Argentina","Argelia","Austria","Jordania",
  "Portugal","RD Congo","Uzbekistán","Colombia",
  "Inglaterra","Croacia","Ghana","Panamá"
];

const GROUPS = {
  A:["México","Sudáfrica","Corea del Sur","Rep. Checa"],
  B:["Canadá","Bosnia","Catar","Suiza"],
  C:["Brasil","Marruecos","Haití","Escocia"],
  D:["Estados Unidos","Paraguay","Australia","Turquía"],
  E:["Alemania","Curazao","Costa de Marfil","Ecuador"],
  F:["Países Bajos","Japón","Suecia","Túnez"],
  G:["Bélgica","Egipto","Irán","Nueva Zelanda"],
  H:["España","Cabo Verde","Arabia Saudí","Uruguay"],
  I:["Francia","Senegal","Irak","Noruega"],
  J:["Argentina","Argelia","Austria","Jordania"],
  K:["Portugal","RD Congo","Uzbekistán","Colombia"],
  L:["Inglaterra","Croacia","Ghana","Panamá"]
};

const DEFAULT_PLAYERS = [
  // Argentina
  "Messi","Di María","Lautaro Martínez","Julián Álvarez","Enzo Fernández","Mac Allister","De Paul","Lo Celso","Dybala","Garnacho","Thiago Almada",
  // Francia
  "Mbappé","Griezmann","Dembélé","Camavinga","Tchouaméni","Rabiot","Coman","Thuram","Giroud","Fofana",
  // Brasil
  "Vinicius Jr","Rodrygo","Raphinha","Neymar","Endrick","Lucas Paquetá","Bruno Guimarães","Gerson","Savinho","Luiz Henrique",
  // España
  "Yamal","Pedri","Gavi","Olmo","Morata","Ferran Torres","Fabián Ruiz","Rodri","Nico Williams","Oyarzabal","Joselu",
  // Inglaterra
  "Bellingham","Kane","Saka","Rashford","Foden","Rice","Mount","Grealish","Palmer","Gordon","Toney",
  // Portugal
  "Ronaldo","Bruno Fernandes","Bernardo Silva","Rafael Leão","Gonçalo Ramos","Vitinha","João Neves","Pedro Neto","Diogo Jota",
  // Alemania
  "Wirtz","Müller","Havertz","Gnabry","Musiala","Sané","Kroos","Gündogan","Füllkrug","Undav",
  // Países Bajos
  "Depay","Xavi Simons","Gakpo","Bergwijn","Koopmeiners","Reijnders","Zirkzee","Frimpong",
  // Bélgica
  "De Bruyne","Lukaku","Doku","Tielemans","Vanaken","Openda","Bakayoko",
  // Uruguay
  "Valverde","Bentancur","Núñez","Ugarte","De Arrascaeta","Suárez","Cavani",
  // Colombia
  "James Rodríguez","Luis Díaz","Cuadrado","Borja","Sinisterra","Lerma","Ríos",
  // México
  "Lozano","Raúl Jiménez","Antuna","Romo","Herrera","Guardado","Vega",
  // Marruecos
  "Ziyech","En-Nesyri","Hakimi","Sabiri","Ounahi","El Khannous","Boufal","Amrabat",
  // Japón
  "Kubo","Mitoma","Doan","Kamada","Endo","Morita","Furuhashi","Ueda","Minamino",
  // Senegal
  "Sadio Mané","Ismaila Sarr","Gana Gueye","Pape Matar Sarr","Dia","Ndiaye","Diatta",
  // Croacia
  "Modric","Kovacic","Perisic","Kramaric","Livaja","Brozovic","Pasalic","Sucic",
  // Estados Unidos
  "Pulisic","Reyna","McKennie","Adams","Musah","Weah","Ferreira","Balogun","Aaronson",
  // Ecuador
  "Valencia","Plata","Caicedo","Ibarra","Sarmiento","Preciado",
  // Corea del Sur
  "Son","Lee Kang-in","Hwang Hee-chan","Hwang In-beom","Cho Gue-sung",
  // Australia
  "Hrustic","Irvine","Leckie","Maclaren","McGree","Boyle",
  // Suiza
  "Shaqiri","Embolo","Vargas","Aebischer","Freuler","Okafor","Sow",
  // Canadá
  "Davies","David","Buchanan","Larin","Osorio","Eustaquio",
  // Noruega
  "Haaland","Ødegaard","Sörloth","Elyounoussi","Berge","Thorsby",
  // Turquía
  "Calhanoglu","Yazici","Under","Akturkoglu","Yildiz","Güler","Karaman",
  // Austria
  "Alaba","Sabitzer","Baumgartner","Arnautovic","Gregoritsch","Wimmer",
  // Suecia
  "Kulusevski","Isak","Ekdal","Forsberg","Elanga","Svanberg",
  // Ghana
  "Kudus","Ayew J.","Partey","Sulemana","Issahaku",
  // Túnez
  "Msakni","Khazri","Ben Slimane","Laidouni","Jebali",
  // Argelia
  "Mahrez","Belaili","Benrahma","Slimani","Atal","Bentaleb",
  // Costa de Marfil
  "Pépé","Haller","Zaha","Sangaré","Gradel","Kessié",
  // Irán
  "Taremi","Jahanbakhsh","Azmoun","Gholizadeh",
  // Polonia
  "Lewandowski","Zielinski","Szymanski","Milik","Frankowski",
  // Escocia
  "McTominay","Robertson","McGinn","Christie","Adams L.",
  // Panamá
  "Davis","Fajardo","Godoy","Carrasquilla",
  // Paraguay
  "Almiron","Enciso","Romero","Alderete",
];

const GROUP_MATCHES = [
  // 11 Jun
  {id:"A1",group:"A",team1:"México",team2:"Sudáfrica",date:"11 Jun",time:"21:00",dateNum:1121,phase:"Grupos"},
  // 12 Jun
  {id:"A2",group:"A",team1:"Corea del Sur",team2:"Rep. Checa",date:"12 Jun",time:"04:00",dateNum:1204,phase:"Grupos"},
  {id:"B1",group:"B",team1:"Canadá",team2:"Bosnia",date:"12 Jun",time:"21:00",dateNum:1221,phase:"Grupos"},
  // 13 Jun
  {id:"D1",group:"D",team1:"Estados Unidos",team2:"Paraguay",date:"13 Jun",time:"03:00",dateNum:1303,phase:"Grupos"},
  {id:"B2",group:"B",team1:"Catar",team2:"Suiza",date:"13 Jun",time:"21:00",dateNum:1321,phase:"Grupos"},
  // 14 Jun
  {id:"C1",group:"C",team1:"Brasil",team2:"Marruecos",date:"14 Jun",time:"00:00",dateNum:1400,phase:"Grupos"},
  {id:"C2",group:"C",team1:"Haití",team2:"Escocia",date:"14 Jun",time:"03:00",dateNum:1403,phase:"Grupos"},
  {id:"D2",group:"D",team1:"Australia",team2:"Turquía",date:"14 Jun",time:"06:00",dateNum:1406,phase:"Grupos"},
  {id:"E1",group:"E",team1:"Alemania",team2:"Curazao",date:"14 Jun",time:"19:00",dateNum:1419,phase:"Grupos"},
  {id:"F1",group:"F",team1:"Países Bajos",team2:"Japón",date:"14 Jun",time:"22:00",dateNum:1422,phase:"Grupos"},
  // 15 Jun
  {id:"E2",group:"E",team1:"Costa de Marfil",team2:"Ecuador",date:"15 Jun",time:"01:00",dateNum:1501,phase:"Grupos"},
  {id:"F2",group:"F",team1:"Suecia",team2:"Túnez",date:"15 Jun",time:"04:00",dateNum:1504,phase:"Grupos"},
  {id:"H1",group:"H",team1:"España",team2:"Cabo Verde",date:"15 Jun",time:"18:00",dateNum:1518,phase:"Grupos"},
  {id:"G1",group:"G",team1:"Bélgica",team2:"Egipto",date:"15 Jun",time:"21:00",dateNum:1521,phase:"Grupos"},
  // 16 Jun
  {id:"H2",group:"H",team1:"Arabia Saudí",team2:"Uruguay",date:"16 Jun",time:"00:00",dateNum:1600,phase:"Grupos"},
  {id:"G2",group:"G",team1:"Irán",team2:"Nueva Zelanda",date:"16 Jun",time:"03:00",dateNum:1603,phase:"Grupos"},
  {id:"I1",group:"I",team1:"Francia",team2:"Senegal",date:"16 Jun",time:"21:00",dateNum:1621,phase:"Grupos"},
  // 17 Jun
  {id:"I2",group:"I",team1:"Irak",team2:"Noruega",date:"17 Jun",time:"00:00",dateNum:1700,phase:"Grupos"},
  {id:"J1",group:"J",team1:"Argentina",team2:"Argelia",date:"17 Jun",time:"03:00",dateNum:1703,phase:"Grupos"},
  {id:"J2",group:"J",team1:"Austria",team2:"Jordania",date:"17 Jun",time:"06:00",dateNum:1706,phase:"Grupos"},
  {id:"K1",group:"K",team1:"Portugal",team2:"RD Congo",date:"17 Jun",time:"19:00",dateNum:1719,phase:"Grupos"},
  {id:"L1",group:"L",team1:"Inglaterra",team2:"Croacia",date:"17 Jun",time:"22:00",dateNum:1722,phase:"Grupos"},
  // 18 Jun
  {id:"L2",group:"L",team1:"Ghana",team2:"Panamá",date:"18 Jun",time:"01:00",dateNum:1801,phase:"Grupos"},
  {id:"K2",group:"K",team1:"Uzbekistán",team2:"Colombia",date:"18 Jun",time:"04:00",dateNum:1804,phase:"Grupos"},
  {id:"A3",group:"A",team1:"Rep. Checa",team2:"Sudáfrica",date:"18 Jun",time:"18:00",dateNum:1818,phase:"Grupos"},
  {id:"B3",group:"B",team1:"Suiza",team2:"Bosnia",date:"18 Jun",time:"21:00",dateNum:1821,phase:"Grupos"},
  // 19 Jun
  {id:"B4",group:"B",team1:"Canadá",team2:"Catar",date:"19 Jun",time:"00:00",dateNum:1900,phase:"Grupos"},
  {id:"A4",group:"A",team1:"México",team2:"Corea del Sur",date:"19 Jun",time:"03:00",dateNum:1903,phase:"Grupos"},
  {id:"D4",group:"D",team1:"Estados Unidos",team2:"Australia",date:"19 Jun",time:"21:00",dateNum:1921,phase:"Grupos"},
  // 20 Jun
  {id:"C3",group:"C",team1:"Escocia",team2:"Marruecos",date:"20 Jun",time:"00:00",dateNum:2000,phase:"Grupos"},
  {id:"C4",group:"C",team1:"Brasil",team2:"Haití",date:"20 Jun",time:"02:30",dateNum:2002,phase:"Grupos"},
  {id:"D3",group:"D",team1:"Turquía",team2:"Paraguay",date:"20 Jun",time:"05:00",dateNum:2005,phase:"Grupos"},
  {id:"F4",group:"F",team1:"Países Bajos",team2:"Suecia",date:"20 Jun",time:"19:00",dateNum:2019,phase:"Grupos"},
  {id:"E4",group:"E",team1:"Alemania",team2:"Costa de Marfil",date:"20 Jun",time:"22:00",dateNum:2022,phase:"Grupos"},
  // 21 Jun
  {id:"E3",group:"E",team1:"Ecuador",team2:"Curazao",date:"21 Jun",time:"02:00",dateNum:2102,phase:"Grupos"},
  {id:"F3",group:"F",team1:"Túnez",team2:"Japón",date:"21 Jun",time:"06:00",dateNum:2106,phase:"Grupos"},
  {id:"H4",group:"H",team1:"España",team2:"Arabia Saudí",date:"21 Jun",time:"18:00",dateNum:2118,phase:"Grupos"},
  {id:"G4",group:"G",team1:"Bélgica",team2:"Irán",date:"21 Jun",time:"21:00",dateNum:2121,phase:"Grupos"},
  // 22 Jun
  {id:"H3",group:"H",team1:"Uruguay",team2:"Cabo Verde",date:"22 Jun",time:"00:00",dateNum:2200,phase:"Grupos"},
  {id:"G3",group:"G",team1:"Nueva Zelanda",team2:"Egipto",date:"22 Jun",time:"03:00",dateNum:2203,phase:"Grupos"},
  {id:"J4",group:"J",team1:"Argentina",team2:"Austria",date:"22 Jun",time:"19:00",dateNum:2219,phase:"Grupos"},
  {id:"I4",group:"I",team1:"Francia",team2:"Irak",date:"22 Jun",time:"23:00",dateNum:2223,phase:"Grupos"},
  // 23 Jun
  {id:"I3",group:"I",team1:"Noruega",team2:"Senegal",date:"23 Jun",time:"02:00",dateNum:2302,phase:"Grupos"},
  {id:"J3",group:"J",team1:"Jordania",team2:"Argelia",date:"23 Jun",time:"05:00",dateNum:2305,phase:"Grupos"},
  {id:"K4",group:"K",team1:"Portugal",team2:"Uzbekistán",date:"23 Jun",time:"19:00",dateNum:2319,phase:"Grupos"},
  {id:"L4",group:"L",team1:"Inglaterra",team2:"Ghana",date:"23 Jun",time:"22:00",dateNum:2322,phase:"Grupos"},
  // 24 Jun
  {id:"L3",group:"L",team1:"Panamá",team2:"Croacia",date:"24 Jun",time:"01:00",dateNum:2401,phase:"Grupos"},
  {id:"K3",group:"K",team1:"Colombia",team2:"RD Congo",date:"24 Jun",time:"04:00",dateNum:2404,phase:"Grupos"},
  {id:"B5",group:"B",team1:"Bosnia",team2:"Catar",date:"24 Jun",time:"21:00",dateNum:2421,phase:"Grupos"},
  {id:"B6",group:"B",team1:"Suiza",team2:"Canadá",date:"24 Jun",time:"21:00",dateNum:2421,phase:"Grupos"},
  // 25 Jun
  {id:"C5",group:"C",team1:"Marruecos",team2:"Haití",date:"25 Jun",time:"00:00",dateNum:2500,phase:"Grupos"},
  {id:"C6",group:"C",team1:"Escocia",team2:"Brasil",date:"25 Jun",time:"00:00",dateNum:2500,phase:"Grupos"},
  {id:"A5",group:"A",team1:"Rep. Checa",team2:"México",date:"25 Jun",time:"03:00",dateNum:2503,phase:"Grupos"},
  {id:"A6",group:"A",team1:"Sudáfrica",team2:"Corea del Sur",date:"25 Jun",time:"03:00",dateNum:2503,phase:"Grupos"},
  {id:"E5",group:"E",team1:"Ecuador",team2:"Alemania",date:"25 Jun",time:"22:00",dateNum:2522,phase:"Grupos"},
  {id:"E6",group:"E",team1:"Curazao",team2:"Costa de Marfil",date:"25 Jun",time:"22:00",dateNum:2522,phase:"Grupos"},
  // 26 Jun
  {id:"F5",group:"F",team1:"Japón",team2:"Suecia",date:"26 Jun",time:"01:00",dateNum:2601,phase:"Grupos"},
  {id:"F6",group:"F",team1:"Túnez",team2:"Países Bajos",date:"26 Jun",time:"01:00",dateNum:2601,phase:"Grupos"},
  {id:"D5",group:"D",team1:"Turquía",team2:"Estados Unidos",date:"26 Jun",time:"04:00",dateNum:2604,phase:"Grupos"},
  {id:"D6",group:"D",team1:"Paraguay",team2:"Australia",date:"26 Jun",time:"04:00",dateNum:2604,phase:"Grupos"},
  {id:"I5",group:"I",team1:"Senegal",team2:"Irak",date:"26 Jun",time:"21:00",dateNum:2621,phase:"Grupos"},
  {id:"I6",group:"I",team1:"Noruega",team2:"Francia",date:"26 Jun",time:"21:00",dateNum:2621,phase:"Grupos"},
  // 27 Jun
  {id:"H5",group:"H",team1:"Cabo Verde",team2:"Arabia Saudí",date:"27 Jun",time:"02:00",dateNum:2702,phase:"Grupos"},
  {id:"H6",group:"H",team1:"Uruguay",team2:"España",date:"27 Jun",time:"02:00",dateNum:2702,phase:"Grupos"},
  {id:"G5",group:"G",team1:"Egipto",team2:"Irán",date:"27 Jun",time:"05:00",dateNum:2705,phase:"Grupos"},
  {id:"G6",group:"G",team1:"Nueva Zelanda",team2:"Bélgica",date:"27 Jun",time:"05:00",dateNum:2705,phase:"Grupos"},
  {id:"L5",group:"L",team1:"Croacia",team2:"Ghana",date:"27 Jun",time:"23:00",dateNum:2723,phase:"Grupos"},
  {id:"L6",group:"L",team1:"Panamá",team2:"Inglaterra",date:"27 Jun",time:"23:00",dateNum:2723,phase:"Grupos"},
  // 28 Jun
  {id:"J5",group:"J",team1:"Argelia",team2:"Austria",date:"28 Jun",time:"02:00",dateNum:2802,phase:"Grupos"},
  {id:"J6",group:"J",team1:"Jordania",team2:"Argentina",date:"28 Jun",time:"02:00",dateNum:2802,phase:"Grupos"},
  {id:"K5",group:"K",team1:"RD Congo",team2:"Uzbekistán",date:"28 Jun",time:"05:00",dateNum:2805,phase:"Grupos"},
  {id:"K6",group:"K",team1:"Colombia",team2:"Portugal",date:"28 Jun",time:"05:00",dateNum:2805,phase:"Grupos"},
];

// Lista ordenada cronológicamente para vistas de partidos
const GROUP_MATCHES_CHRONO = [...GROUP_MATCHES].sort((a,b)=>{
  if(a.dateNum!==b.dateNum) return a.dateNum-b.dateNum;
  return (a.time||"00:00").localeCompare(b.time||"00:00");
});

const R32 = [
  // Dieciseisavos — hora española CEST (UTC+2), según calendario oficial FIFA
  {id:"R32-1", label:"P73", desc:"2º A vs 2º B",     date:"28 Jun",time:"21:00",phase:"Dieciseisavos"},
  {id:"R32-2", label:"P74", desc:"1º E vs Mejor 3º", date:"29 Jun",time:"22:30",phase:"Dieciseisavos"},
  {id:"R32-3", label:"P75", desc:"1º F vs 2º C",     date:"30 Jun",time:"03:00",phase:"Dieciseisavos"},
  {id:"R32-4", label:"P76", desc:"1º C vs 2º F",     date:"29 Jun",time:"19:00",phase:"Dieciseisavos"},
  {id:"R32-5", label:"P77", desc:"1º I vs Mejor 3º", date:"30 Jun",time:"23:00",phase:"Dieciseisavos"},
  {id:"R32-6", label:"P78", desc:"2º E vs 2º I",     date:"30 Jun",time:"19:00",phase:"Dieciseisavos"},
  {id:"R32-7", label:"P79", desc:"1º A vs Mejor 3º", date:"01 Jul",time:"03:00",phase:"Dieciseisavos"},
  {id:"R32-8", label:"P80", desc:"1º L vs Mejor 3º", date:"01 Jul",time:"18:00",phase:"Dieciseisavos"},
  {id:"R32-9", label:"P81", desc:"1º D vs Mejor 3º", date:"02 Jul",time:"02:00",phase:"Dieciseisavos"},
  {id:"R32-10",label:"P82", desc:"1º G vs Mejor 3º", date:"01 Jul",time:"22:00",phase:"Dieciseisavos"},
  {id:"R32-11",label:"P83", desc:"2º K vs 2º L",     date:"02 Jul",time:"01:00",phase:"Dieciseisavos"},
  {id:"R32-12",label:"P84", desc:"1º H vs 2º J",     date:"02 Jul",time:"21:00",phase:"Dieciseisavos"},
  {id:"R32-13",label:"P85", desc:"1º B vs Mejor 3º", date:"03 Jul",time:"22:00",phase:"Dieciseisavos"},
  {id:"R32-14",label:"P86", desc:"1º J vs 2º H",     date:"04 Jul",time:"02:30",phase:"Dieciseisavos"},
  {id:"R32-15",label:"P87", desc:"1º K vs Mejor 3º", date:"04 Jul",time:"03:30",phase:"Dieciseisavos"},
  {id:"R32-16",label:"P88", desc:"2º D vs 2º G",     date:"03 Jul",time:"20:00",phase:"Dieciseisavos"},
];
const R16 = [
  // Octavos — hora española CEST
  {id:"R16-1",label:"P89",desc:"G.P74 vs G.P77",date:"04 Jul",time:"23:00",phase:"Octavos"},
  {id:"R16-2",label:"P90",desc:"G.P73 vs G.P75",date:"04 Jul",time:"19:00",phase:"Octavos"},
  {id:"R16-3",label:"P91",desc:"G.P76 vs G.P78",date:"05 Jul",time:"22:00",phase:"Octavos"},
  {id:"R16-4",label:"P92",desc:"G.P79 vs G.P80",date:"06 Jul",time:"03:00",phase:"Octavos"},
  {id:"R16-5",label:"P93",desc:"G.P83 vs G.P84",date:"06 Jul",time:"21:00",phase:"Octavos"},
  {id:"R16-6",label:"P94",desc:"G.P81 vs G.P82",date:"07 Jul",time:"02:00",phase:"Octavos"},
  {id:"R16-7",label:"P95",desc:"G.P86 vs G.P88",date:"07 Jul",time:"18:00",phase:"Octavos"},
  {id:"R16-8",label:"P96",desc:"G.P85 vs G.P87",date:"07 Jul",time:"22:00",phase:"Octavos"},
];
const QF = [
  // Cuartos — hora española CEST
  {id:"QF-1",label:"CF1",desc:"G.P89 vs G.P90",date:"09 Jul",time:"22:00",phase:"Cuartos"},
  {id:"QF-2",label:"CF2",desc:"G.P93 vs G.P94",date:"10 Jul",time:"21:00",phase:"Cuartos"},
  {id:"QF-3",label:"CF3",desc:"G.P91 vs G.P92",date:"11 Jul",time:"23:00",phase:"Cuartos"},
  {id:"QF-4",label:"CF4",desc:"G.P95 vs G.P96",date:"12 Jul",time:"03:00",phase:"Cuartos"},
];
const SF = [
  // Semifinales — hora española CEST (~02:00, partido 21h ET en Dallas/Atlanta)
  {id:"SF-1",label:"SF1",desc:"G.CF1 vs G.CF2",date:"14 Jul",time:"02:00",phase:"Semifinal"},
  {id:"SF-2",label:"SF2",desc:"G.CF3 vs G.CF4",date:"15 Jul",time:"02:00",phase:"Semifinal"},
];
const FIN = {id:"FIN",label:"FINAL",desc:"G.SF1 vs G.SF2",date:"19 Jul",time:"22:00",phase:"Final"};
const ALL_BRACKET = [...R32,...R16,...QF,...SF,FIN];
// v31 - generación automática de emparejamientos eliminatorias
const BRACKET_BY_PHASE = {"Dieciseisavos":R32,"Octavos":R16,"Cuartos":QF,"Semifinal":SF,"Final":[FIN]};

// ─── Generación automática de emparejamientos ─────────────────────────────
// Devuelve {matchId: {team1, team2}} con los equipos calculados automáticamente
// basándose en los resultados de la fase anterior

function calcBracket(matches) {
  const result = {};

  // Comprueba si una fase está completamente jugada
  const phaseComplete = (phase, count) => {
    const played = matches.filter(m => m.phase === phase && m.played).length;
    return played >= count;
  };

  // Ganador de un partido ya jugado
  const winner = (matchId) => {
    const m = matches.find(x => x.id === matchId && x.played);
    if (!m) return null;
    if (m.score1 > m.score2) return m.team1;
    if (m.score2 > m.score1) return m.team2;
    return m.penWinner || null;
  };

  const pos = (g, n) => groupStandings(g, matches)[n]?.team || null;
  const thirds = bestThirds(matches);
  const best3 = thirds.slice(0, 8).map(t => t.team);

  // ── DIECISEISAVOS: solo si los 72 partidos de grupos están jugados ──
  if (phaseComplete("Grupos", 72)) {
    result["R32-1"]  = { team1: pos("A",1),   team2: pos("B",1) };
    result["R32-2"]  = { team1: pos("E",0),   team2: null }; // P74: Mejor 3º — rellenar al terminar grupos
    result["R32-3"]  = { team1: pos("F",0),   team2: pos("C",1) };
    result["R32-4"]  = { team1: pos("C",0),   team2: pos("F",1) };
    result["R32-5"]  = { team1: pos("I",0),   team2: null }; // P77: Mejor 3º — rellenar al terminar grupos
    result["R32-6"]  = { team1: pos("E",1),   team2: pos("I",1) };
    result["R32-7"]  = { team1: pos("A",0),   team2: null }; // P79: Mejor 3º — rellenar al terminar grupos
    result["R32-8"]  = { team1: pos("L",0),   team2: null }; // P80: Mejor 3º — rellenar al terminar grupos
    result["R32-9"]  = { team1: pos("D",0),   team2: null }; // P81: Mejor 3º — rellenar al terminar grupos
    result["R32-10"] = { team1: pos("G",0),   team2: null }; // P82: Mejor 3º — rellenar al terminar grupos
    result["R32-11"] = { team1: pos("K",1),   team2: pos("L",1) };
    result["R32-12"] = { team1: pos("H",0),   team2: pos("J",1) };
    result["R32-13"] = { team1: pos("B",0),   team2: null }; // P85: Mejor 3º — rellenar al terminar grupos
    result["R32-14"] = { team1: pos("J",0),   team2: pos("H",1) };
    result["R32-15"] = { team1: pos("K",0),   team2: null }; // P87: Mejor 3º — rellenar al terminar grupos
    result["R32-16"] = { team1: pos("D",1),   team2: pos("G",1) };
  }

  // ── OCTAVOS: solo si los 16 partidos de dieciseisavos están jugados ──
  if (phaseComplete("Dieciseisavos", 16)) {
    result["R16-1"] = { team1: winner("R32-2"),  team2: winner("R32-5")  }; // P89: G.P74 vs G.P77
    result["R16-2"] = { team1: winner("R32-1"),  team2: winner("R32-3")  }; // P90: G.P73 vs G.P75
    result["R16-3"] = { team1: winner("R32-4"),  team2: winner("R32-6")  }; // P91: G.P76 vs G.P78
    result["R16-4"] = { team1: winner("R32-7"),  team2: winner("R32-8")  }; // P92: G.P79 vs G.P80
    result["R16-5"] = { team1: winner("R32-11"), team2: winner("R32-12") }; // P93: G.P83 vs G.P84
    result["R16-6"] = { team1: winner("R32-9"),  team2: winner("R32-10") }; // P94: G.P81 vs G.P82
    result["R16-7"] = { team1: winner("R32-14"), team2: winner("R32-16") }; // P95: G.P86 vs G.P88
    result["R16-8"] = { team1: winner("R32-13"), team2: winner("R32-15") }; // P96: G.P85 vs G.P87
  }

  // ── CUARTOS: solo si los 8 partidos de octavos están jugados ──
  if (phaseComplete("Octavos", 8)) {
    result["QF-1"] = { team1: winner("R16-1"), team2: winner("R16-2") };
    result["QF-2"] = { team1: winner("R16-5"), team2: winner("R16-6") };
    result["QF-3"] = { team1: winner("R16-3"), team2: winner("R16-4") };
    result["QF-4"] = { team1: winner("R16-7"), team2: winner("R16-8") };
  }

  // ── SEMIFINAL: solo si los 4 partidos de cuartos están jugados ──
  if (phaseComplete("Cuartos", 4)) {
    result["SF-1"] = { team1: winner("QF-1"), team2: winner("QF-2") };
    result["SF-2"] = { team1: winner("QF-3"), team2: winner("QF-4") };
  }

  // ── FINAL: solo si los 2 partidos de semifinal están jugados ──
  if (phaseComplete("Semifinal", 2)) {
    result["FIN"] = { team1: winner("SF-1"), team2: winner("SF-2") };
  }

  return result;
}

const SC = {win:3,draw:1,goalFor:0.5,goalAgainst:-0.25,phaseAdvance:2,winFinal:8,playerGoal:0.75};

// v19 - ranking de goleadores elegidos por participantes
// Normaliza nombre
const norm = s => s?.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"") || "";

// Puntos de un equipo en un partido (resultado + goles)
// Sin bonus de pasar de fase — ese se calcula aparte
function matchPtsForTeamBase(m, team){
  const isT1=m.team1===team, isT2=m.team2===team;
  if(!isT1&&!isT2) return 0;
  const gf=isT1?m.score1:m.score2, gc=isT1?m.score2:m.score1;
  let pts=0;
  if(gf>gc) pts+=SC.win; else if(gf===gc) pts+=SC.draw;
  pts+=gf*SC.goalFor + gc*SC.goalAgainst;
  return pts;
}

// Bonus de pasar de fase para un equipo en un partido eliminatorio
function phaseBonus(m, team){
  if(m.phase==="Grupos") return 0;
  const winner=m.score1>m.score2?m.team1:m.score2>m.score1?m.team2:(m.penWinner||null);
  if(winner!==team) return 0;
  if(m.phase==="Final") return SC.winFinal; // Final: solo +8, sin +2
  return SC.phaseAdvance; // Resto eliminatorias: +2
}

// +2 por clasificar desde fase de grupos (cuando los 72 partidos están jugados)
// Clasifican: 1º y 2º de cada grupo + 8 mejores terceros
function groupQualBonus(team, matches){
  const groupsPlayed = matches.filter(m=>m.phase==="Grupos"&&m.played).length;
  if(groupsPlayed < 72) return 0; // Solo cuando la fase de grupos está completa
  // Busca el grupo del equipo
  let teamGroup = null;
  for(const [g,teams] of Object.entries(GROUPS)){
    if(teams.includes(team)){ teamGroup = g; break; }
  }
  if(!teamGroup) return 0;
  const standing = groupStandings(teamGroup, matches);
  const pos = standing.findIndex(t=>t.team===team);
  if(pos===0||pos===1) return SC.phaseAdvance; // 1º o 2º → +2
  if(pos===2){
    // Tercer clasificado — +2 solo si está entre los 8 mejores
    const thirds = bestThirds(matches);
    const best8 = thirds.slice(0,8).map(t=>t.team);
    if(best8.includes(team)) return SC.phaseAdvance;
  }
  return 0;
}

// Puntos de jugadores — cuenta goles en todos los partidos (played o no)
// Los goles son hechos reales, independientemente de si el resultado está guardado
function playerPts(participant, matches){
  let total=0;
  for(const m of matches){
    for(const pg of (m.playerGoals||[])){
      if(participant.players.some(p=>norm(p)===norm(pg.player))) total+=SC.playerGoal;
    }
  }
  return total;
}

// GENERAL: todos los partidos + bonus de fase + goles jugadores de todo el torneo
// POR FASE: solo partidos de esa fase + resultado/goles equipo + goles jugadores en esa fase (sin bonus)
// Fusiona dos listas de participantes sin perder ninguno
// Si un participante existe en ambas, gana la versión local (más reciente)
function mergeParticipants(local, remote){
  const merged = [...local];
  for(const rp of remote){
    if(!merged.find(lp=>lp.id===rp.id)){
      merged.push(rp); // añadir participante remoto que no está en local
    }
  }
  return merged;
}

function calcScore(participant, allMatches, phase=null){
  let total=0;
  let phaseMatches;
  if(phase==="J1"||phase==="J2"||phase==="J3"){
    const j=parseInt(phase[1]);
    phaseMatches=allMatches.filter(m=>m.phase==="Grupos"&&getJornada(m.id)===j);
  } else {
    phaseMatches = phase ? allMatches.filter(m=>m.phase===phase) : allMatches;
  }
  const playedMatches = phaseMatches.filter(m=>m.played);
  for(const m of playedMatches){
    for(const t of participant.teams){
      total += matchPtsForTeamBase(m, t);
      if(!phase) total += phaseBonus(m, t);
    }
  }
  // +2 por clasificar desde grupos — solo en general, una vez por equipo
  if(!phase){
    for(const t of participant.teams){
      total += groupQualBonus(t, allMatches);
    }
  }
  total += playerPts(participant, phaseMatches);
  if(!phase){
    if(Array.isArray(participant.manualAdjustments)){total+=participant.manualAdjustments.reduce((s,a)=>s+(a.pts||0),0);}
    else if(participant.manualPts){total+=participant.manualPts;}
  }
  // Créditos sobrantes → puntos extra solo en general
  if(!phase){
    const spent = (participant.teams||[]).reduce((s,t)=>s+kOf(t),0);
    const leftover = MAX_KREDITU - spent;
    if(leftover > 0) total += leftover;
  }
  return Math.round(total*100)/100;
}

// Calcula reparto de premios para una fase
// Devuelve {winners:[{name,prize}], botePakete}
function calcPhasePrize(phase, participants, matches, phasePrize) {
  if(!participants.length) return {winners:[], botePakete:0};
  const ranked = [...participants]
    .map(p=>({...p, score: calcScore(p, matches, phase)}))
    .sort((a,b)=>b.score-a.score);
  if(!ranked.length || ranked[0].score===0) return {winners:[], botePakete:0};

  // Busca todos los que empatan en primer lugar
  const topScore = ranked[0].score;
  const tied = ranked.filter(p=>p.score===topScore);
  const n = tied.length;

  let winners = [];
  let botePakete = 0;

  if(n===1){
    winners = [{name:tied[0].name, prize:phasePrize}];
    botePakete = 0;
  } else if(n===2){
    winners = tied.map(p=>({name:p.name, prize:Math.round(phasePrize/2*100)/100}));
    botePakete = 0;
  } else if(n===3){
    const each = Math.round((phasePrize/3)*10)/10; // 1.5€ cada uno (aprox)
    const resto = Math.round((phasePrize - each*3)*100)/100;
    winners = tied.map(p=>({name:p.name, prize:each}));
    botePakete = resto > 0 ? resto : 0;
    // Redondeo exacto según reglas: 3 → 1.5 cada uno + 0.5 bote
    winners = tied.map(p=>({name:p.name, prize:1.5}));
    botePakete = 0.5;
  } else if(n===4){
    winners = tied.map(p=>({name:p.name, prize:1}));
    botePakete = 1;
  } else if(n===5){
    winners = tied.map(p=>({name:p.name, prize:1}));
    botePakete = 0;
  } else {
    // 6 o más → todo al bote pakete
    winners = [];
    botePakete = phasePrize;
  }

  return {winners, botePakete};
}

// Comprueba si una fase está completa (todos sus partidos jugados)
function isPhaseComplete(phase, matches) {
  const total = {"Grupos":72,"J1":24,"J2":24,"J3":24,"Dieciseisavos":16,"Octavos":8,"Cuartos":4,"Semifinal":2,"Final":1};
  if(phase==="J1"||phase==="J2"||phase==="J3"){
    const j=parseInt(phase[1]);
    const played=matches.filter(m=>m.phase==="Grupos"&&m.played&&getJornada(m.id)===j).length;
    return played>=24;
  }
  const played = matches.filter(m=>m.phase===phase && m.played).length;
  return played >= (total[phase]||0);
}
// Criterios FIFA desempate (Reglamento Mundial 2026):
// 1. Puntos  2. DG general  3. GF general  4. Puntos enfrentamiento directo
// 5. DG enfrentamiento directo  6. GF enfrentamiento directo  7. Sorteo
function groupStandings(groupKey, matches){
  const teams = GROUPS[groupKey];
  const stats = {};
  teams.forEach(t=>{ stats[t]={team:t,pj:0,pg:0,pe:0,pp:0,gf:0,gc:0,dif:0,pts:0,group:groupKey}; });
  const gms = matches.filter(m=>m.phase==="Grupos"&&m.played&&teams.includes(m.team1));
  for(const m of gms){
    const t1=stats[m.team1], t2=stats[m.team2];
    if(!t1||!t2) continue;
    t1.pj++; t2.pj++; t1.gf+=m.score1; t1.gc+=m.score2; t2.gf+=m.score2; t2.gc+=m.score1;
    if(m.score1>m.score2){t1.pg++;t1.pts+=3;t2.pp++;}
    else if(m.score1<m.score2){t2.pg++;t2.pts+=3;t1.pp++;}
    else{t1.pe++;t2.pe++;t1.pts++;t2.pts++;}
  }
  Object.values(stats).forEach(t=>t.dif=t.gf-t.gc);

  // Función para obtener stats en enfrentamiento directo entre un subgrupo
  const directStats=(group)=>{
    const ds={};
    group.forEach(t=>{ ds[t]={pts:0,dif:0,gf:0}; });
    for(const m of gms){
      if(!group.includes(m.team1)||!group.includes(m.team2)) continue;
      ds[m.team1].gf+=m.score1; ds[m.team2].gf+=m.score2;
      ds[m.team1].dif+=m.score1-m.score2; ds[m.team2].dif+=m.score2-m.score1;
      if(m.score1>m.score2){ds[m.team1].pts+=3;}
      else if(m.score1<m.score2){ds[m.team2].pts+=3;}
      else{ds[m.team1].pts++;ds[m.team2].pts++;}
    }
    return ds;
  };

  const cmp=(a,b)=>{
    if(b.pts!==a.pts) return b.pts-a.pts;
    if(b.dif!==a.dif) return b.dif-a.dif;
    if(b.gf!==a.gf) return b.gf-a.gf;
    // Enfrentamiento directo
    const ds=directStats([a.team,b.team]);
    if(ds[b.team].pts!==ds[a.team].pts) return ds[b.team].pts-ds[a.team].pts;
    if(ds[b.team].dif!==ds[a.team].dif) return ds[b.team].dif-ds[a.team].dif;
    return ds[b.team].gf-ds[a.team].gf;
  };

  return Object.values(stats).sort(cmp);
}

// Mejores terceros clasificados (toma el 3º de cada grupo y ordena por criterios FIFA)
function bestThirds(matches){
  const thirds = Object.keys(GROUPS).map(g=>{
    const standing = groupStandings(g, matches);
    return standing[2] ? {...standing[2], group:g} : null;
  }).filter(Boolean);

  const cmp=(a,b)=>{
    if(b.pts!==a.pts) return b.pts-a.pts;
    if(b.dif!==a.dif) return b.dif-a.dif;
    if(b.gf!==a.gf) return b.gf-a.gf;
    return a.team.localeCompare(b.team);
  };
  return thirds.sort(cmp);
}

const DEFAULT_PREMIOS_CONFIG = {
  boteTotal: 300,        // € total
  phasePrize: 5,         // € por fase
  generalPct: [45,32,14,9], // % para 1º,2º,3º,4º
};

const initialPorra = () => ({
  participants:[], playerList:[...DEFAULT_PLAYERS], hideTeams:false,
  registrationClosed:false, avisos:[], premiosConfig:{...DEFAULT_PREMIOS_CONFIG}, historial:[],
  homeHidden:{comoFunciona:false, puntuacion:false, creditos:false},
});
const initialState = {
  matches: [],
  adminPassword: "AD1818",  // contraseña admin — se puede cambiar desde el panel
  eibar: initialPorra(),
  zumaia: initialPorra(),
};

export default function PorraMundial(){
  const [state, setState] = useState(initialState);
  const [activePorra, setActivePorra] = useState(()=>{
    // Lee el parámetro ?porra=eibar o ?porra=zumaia de la URL
    try{
      const p = new URLSearchParams(window.location.search).get("porra");
      if(p==="eibar"||p==="zumaia") return p;
    }catch{}
    return null; // null = mostrar selector
  });
  const T = activePorra ? THEMES[activePorra] : THEMES.eibar;

  // Helpers para leer/escribir datos de la porra activa
  const porra = activePorra ? (state[activePorra]||initialPorra()) : initialPorra();
  const setPorra = (updater) => {
    setState(s => ({
      ...s,
      [activePorra]: typeof updater === "function"
        ? updater(s[activePorra]||initialPorra())
        : updater
    }));
  };
  // Accesos directos para compatibilidad con el código existente
  const participants = porra.participants||[];
  const playerList = porra.playerList||DEFAULT_PLAYERS;

  const [view, setView] = useState("home");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPass, setAdminPass] = useState("");
  const [regStep, setRegStep] = useState(1);
  const [newUser, setNewUser] = useState({name:"",teams:[],players:[]});
  const [classPhase, setClassPhase] = useState("General");
  const [toast, setToast] = useState(null);
  const [searchTeam, setSearchTeam] = useState("");
  const [searchPlayer, setSearchPlayer] = useState("");
  const [groupFilter, setGroupFilter] = useState("Todos");
  const [expandedP, setExpandedP] = useState(null);
  const [adminTab, setAdminTab] = useState("grupos");
  const [editMatch, setEditMatch] = useState(null);
  const [scores, setScores] = useState({});
  const [pens, setPens] = useState({});
  const [bracketPhase, setBracketPhase] = useState("Dieciseisavos");
  const [teamDetail, setTeamDetail] = useState(null);
  const [pickerPopup, setPickerPopup] = useState(null);
  const [playerDetail, setPlayerDetail] = useState(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  // Storage: carga primero, solo guarda después de haber cargado
  const [loaded, setLoaded] = useState(false);
  const [saveReady, setSaveReady] = useState(false);
  const isSaving = useRef(false);
  const pendingSave = useRef(null); // timestamp del último cambio local

  useEffect(()=>{
    (async()=>{
      try{
        const {data,error}=await supabase.from('porra_state').select('data').eq('id',1).single();
        if(!error&&data?.data){
          const parsed=typeof data.data==='string'?JSON.parse(data.data):data.data;
          setState(s=>({...initialState,...parsed,
            eibar:{...initialPorra(),...(parsed.eibar||{})},
            zumaia:{...initialPorra(),...(parsed.zumaia||{})},
            matches:parsed.matches||[],
            adminPassword:parsed.adminPassword||"AD1818",
          }));
        }
      }catch(e){console.log("load error",e);}
      setLoaded(true);
      setTimeout(()=>setSaveReady(true),500);
    })();
    const ch=supabase.channel('porra_rt').on('postgres_changes',{event:'UPDATE',schema:'public',table:'porra_state',filter:'id=eq.1'},(payload)=>{
      // Ignorar si hay un guardado pendiente o en curso
      if(isSaving.current) return;
      if(pendingSave.current && Date.now() - pendingSave.current < 5000) return;
      const r=payload.new?.data;
      if(r){
        const p=typeof r==='string'?JSON.parse(r):r;
        setState(prev=>({
          ...prev,
          matches:p.matches||prev.matches,
          adminPassword:p.adminPassword||prev.adminPassword,
          eibar:{...initialPorra(),...(p.eibar||{}),participants:mergeParticipants(prev.eibar?.participants||[],p.eibar?.participants||[])},
          zumaia:{...initialPorra(),...(p.zumaia||{}),participants:mergeParticipants(prev.zumaia?.participants||[],p.zumaia?.participants||[])},
        }));
      }
    }).subscribe();
    return()=>{supabase.removeChannel(ch);};
  },[]);

  useEffect(()=>{
    if(!saveReady)return;
    // Marcar que hay un cambio local pendiente de guardar
    pendingSave.current = Date.now();
    const t=setTimeout(async()=>{
      try{
        isSaving.current=true;
        const {data}=await supabase.from('porra_state').select('data').eq('id',1).single();
        const remote=data?.data?(typeof data.data==='string'?JSON.parse(data.data):data.data):null;
        let toSave=state;
        if(remote){
          toSave={
            ...state,
            eibar:{
              ...state.eibar,
              participants:mergeParticipants(state.eibar?.participants||[], remote.eibar?.participants||[]),
            },
            zumaia:{
              ...state.zumaia,
              participants:mergeParticipants(state.zumaia?.participants||[], remote.zumaia?.participants||[]),
            },
          };
        }
        await supabase.from('porra_state').upsert({id:1,data:toSave});
        // Mantener protección 5 segundos tras guardar
        setTimeout(()=>{
          isSaving.current=false;
          pendingSave.current=null;
        },5000);
      }catch(e){console.log("save error",e);isSaving.current=false;pendingSave.current=null;}
    },400);
    return()=>clearTimeout(t);
  },[state,saveReady]);

  const [standingsGroup, setStandingsGroup] = useState("A");
  const [pgSearch, setPgSearch] = useState({});
  const [t1Search, setT1Search] = useState({});
  const [t2Search, setT2Search] = useState({});
  const [manualOpen, setManualOpen] = useState(null);
  const [manualPts, setManualPts] = useState({});
  const [manualReason, setManualReason] = useState({});
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [nuevoAviso, setNuevoAviso] = useState({titulo:"",texto:"",tipo:"info"});
  const [editParticipant, setEditParticipant] = useState(null);
  const [editSearch, setEditSearch] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");

  const toast_ = (msg,type="ok")=>{ setToast({msg,type}); setTimeout(()=>setToast(null),2500); };
  const getResult = id => state.matches.find(m=>m.id===id);

  // Helper historial
  const addLog = (msg) => {
    const entry = {id:Date.now(), msg, ts:new Date().toLocaleString("es-ES")};
    setPorra(p=>({...p,historial:[entry,...(p.historial||[])].slice(0,100)}));
  };

  // Contador regresivo al Mundial (11 Jun 2026 19:00 CEST)
  const [countdown, setCountdown] = useState("");
  useEffect(()=>{
    const target = new Date("2026-06-11T17:00:00Z"); // 19:00 CEST = 17:00 UTC
    const tick = ()=>{
      const diff = target - new Date();
      if(diff<=0){ setCountdown(""); return; }
      const d=Math.floor(diff/86400000);
      const h=Math.floor((diff%86400000)/3600000);
      const m=Math.floor((diff%3600000)/60000);
      const s=Math.floor((diff%60000)/1000);
      setCountdown(`${d}d ${h}h ${m}m ${s}s`);
    };
    tick();
    const id=setInterval(tick,1000);
    return()=>clearInterval(id);
  },[]);
  const medal = i => ["🥇","🥈","🥉"][i]||`${i+1}º`;
  const PHASES_LIST = activePorra==="zumaia"
    ? ["J1","J2","J3","Dieciseisavos","Octavos","Cuartos","Semifinal"]
    : ["Grupos","Dieciseisavos","Octavos","Cuartos","Semifinal"];

  const rankings = phase => {
    return [...participants]
      .map(p=>({...p, score: calcScore(p, state.matches, phase==="General" ? null : phase)}))
      .sort((a,b)=>b.score-a.score);
  };

  const toggle = (arr,item,max)=>{
    if(arr.includes(item)) return arr.filter(x=>x!==item);
    if(arr.length>=max){ toast_(`Máximo ${max}`,"err"); return arr; }
    return [...arr,item];
  };

  const saveResult = (matchId,phase,team1,team2)=>{
    const s1=scores[matchId+"_1"], s2=scores[matchId+"_2"];
    if(s1===undefined||s1===""||s2===undefined||s2==="") return toast_("Introduce los goles","err");
    setState(prev=>{
      const ex=prev.matches.find(m=>m.id===matchId);
      const data={id:matchId,phase,team1,team2,score1:parseInt(s1),score2:parseInt(s2),played:true,penWinner:pens[matchId]||"",playerGoals:ex?.playerGoals||[]};
      if(ex) return {...prev,matches:prev.matches.map(m=>m.id===matchId?data:m)};
      return {...prev,matches:[...prev.matches,data]};
    });
    setEditMatch(null);
    toast_("Resultado guardado ✓");
    addLog(`⚽ Resultado: ${team1} ${parseInt(s1)}–${parseInt(s2)} ${team2} (${phase})`);
  };

  const addPG = (matchId, name)=>{
    if(!name) return toast_("Escribe el nombre del jugador","err");
    const tpl=[...GROUP_MATCHES,...ALL_BRACKET].find(m=>m.id===matchId);
    setState(prev=>{
      const ex=prev.matches.find(m=>m.id===matchId);
      if(ex) return {...prev,matches:prev.matches.map(m=>m.id===matchId?{...m,playerGoals:[...(m.playerGoals||[]),{player:name}]}:m)};
      return {...prev,matches:[...prev.matches,{id:matchId,phase:tpl?.phase||"",team1:tpl?.team1||"",team2:tpl?.team2||"",score1:0,score2:0,played:true,penWinner:"",playerGoals:[{player:name}]}]};
    });
    toast_(`Gol de ${name} ✓`);
    const m = tpl||{team1:"",team2:""};
    addLog(`🥅 Gol de ${name} en ${m.team1} vs ${m.team2}`);
  };

  // Elimina el resultado de un partido (lo borra del array de matches)
  const resetMatch = (matchId) => {
    setState(s=>({...s, matches: s.matches.filter(m=>m.id!==matchId)}));
    addLog(`🔄 Resultado eliminado: partido ${matchId}`);
    toast_("Resultado eliminado ✓");
  };

  // Elimina todos los resultados
  const resetAllMatches = () => {
    setState(s=>({...s, matches:[]}));
    addLog("🔄 Todos los resultados eliminados");
    toast_("Todos los resultados eliminados");
  };

  const removePG = (matchId,playerName)=>{
    setState(prev=>({...prev,matches:prev.matches.map(m=>{
      if(m.id!==matchId) return m;
      const idx=m.playerGoals.findIndex(g=>g.player===playerName);
      if(idx===-1) return m;
      const ng=[...m.playerGoals]; ng.splice(idx,1);
      return {...m,playerGoals:ng};
    })}));
  };

  // ── Desglose equipo ───────────────────────────────────────────────────────
  const calcTeamBreakdown = (team, playersList, phase=null)=>{
    const rows=[];
    let totalPts=0;
    let matches;
    if(phase==="J1"||phase==="J2"||phase==="J3"){
      const j=parseInt(phase[1]);
      matches=state.matches.filter(m=>m.played&&(m.team1===team||m.team2===team)&&m.phase==="Grupos"&&getJornada(m.id)===j);
    } else {
      matches = phase
        ? state.matches.filter(m=>m.played&&(m.team1===team||m.team2===team)&&m.phase===phase)
        : state.matches.filter(m=>m.played&&(m.team1===team||m.team2===team));
    }

    for(const m of matches){
      const isT1=m.team1===team;
      const gf=isT1?m.score1:m.score2, gc=isT1?m.score2:m.score1;
      const rival=isT1?m.team2:m.team1;
      let pts=0; const bd=[];

      // Resultado
      if(gf>gc){pts+=3;bd.push("Victoria +3");}
      else if(gf===gc){
        pts+=1;
        if(!phase && m.penWinner) bd.push("Empate en 90 min +1 (solo cuentan los 90 min)");
        else bd.push("Empate +1");
      }
      else bd.push("Derrota +0");

      // Goles a favor/en contra
      if(gf>0){const v=gf*0.5;pts+=v;bd.push(`${gf} gol${gf>1?"es":""} a favor +${v}`);}
      if(gc>0){const v=Math.round(gc*-0.25*100)/100;pts+=v;bd.push(`${gc} gol${gc>1?"es":""} en contra ${v}`);}

      // Bonus pasar de fase: SOLO en general
      if(!phase && m.phase!=="Grupos"){
        const winner=m.score1>m.score2?m.team1:m.score2>m.score1?m.team2:(m.penWinner||null);
        if(winner===team){
          if(m.phase==="Final"){
            pts+=8; bd.push("¡Campeón! +8"); // Final: solo +8, sin +2
          } else {
            pts+=2; bd.push("Pasa de fase +2"); // Resto: +2
          }
        } else if(winner) bd.push("Eliminado +0");
      }

      // Goles de jugadores: solo info, NO se suman al pts del equipo (se suman 1 vez en calcScore)
      const pgGoals=(m.playerGoals||[]).filter(pg=>playersList.some(p=>norm(p)===norm(pg.player)));
      if(pgGoals.length>0){
        const g=pgGoals.reduce((a,n)=>{a[n.player]=(a[n.player]||0)+1;return a},{});
        bd.push(`ℹ️ Tus jugadores marcaron: ${Object.entries(g).map(([n,c])=>`${n}(${c}⚽)`).join(", ")} — ver desglose jugadores`);
      }

      totalPts+=pts;
      rows.push({matchId:m.id,phase:m.phase,date:m.date||"",rival,gf,gc,result:`${gf}–${gc}`,pts:Math.round(pts*100)/100,bd});
    }
    // Bonus clasificar desde grupos — solo en general, al final
    if(!phase){
      const qb = groupQualBonus(team, state.matches);
      if(qb>0){
        totalPts += qb;
        rows.push({matchId:"qual",phase:"Grupos",date:"",rival:"",gf:0,gc:0,result:"✓",pts:qb,bd:[`Clasifica desde grupos +${qb}`]});
      }
    }
    return {rows,totalPts:Math.round(totalPts*100)/100};
  };
  // phase=null → todos los partidos (General); phase="Grupos" → solo esa fase
  const calcPlayerBreakdown = (player, phase=null)=>{
    const rows=[]; let totalGoals=0,totalPts=0;
    let matches;
    if(phase==="J1"||phase==="J2"||phase==="J3"){
      const j=parseInt(phase[1]);
      matches=state.matches.filter(m=>m.phase==="Grupos"&&getJornada(m.id)===j);
    } else {
      matches = phase ? state.matches.filter(m=>m.phase===phase) : state.matches;
    }
    for(const m of matches){
      if(!m.played) continue;
      const goals=(m.playerGoals||[]).filter(pg=>norm(pg.player)===norm(player)).length;
      if(!goals) continue;
      const pts=Math.round(goals*0.75*100)/100;
      totalGoals+=goals; totalPts+=pts;
      rows.push({phase:m.phase,date:m.date||"",team1:m.team1,team2:m.team2,score1:m.score1,score2:m.score2,goals,pts});
    }
    return {rows,totalGoals,totalPts:Math.round(totalPts*100)/100};
  };

  const S={
    card:{background:"rgba(255,255,255,0.05)",borderRadius:14,padding:14,border:"1px solid rgba(255,255,255,0.09)",marginBottom:8},
    btn:a=>({padding:"8px 13px",borderRadius:20,border:"none",cursor:"pointer",fontSize:13,fontFamily:"sans-serif",fontWeight:600,whiteSpace:"nowrap",background:a?T.primaryGrad:"rgba(255,255,255,0.07)",color:a?T.btnActiveTxt:"#aaa"}),
    input:{width:"100%",padding:"11px 12px",borderRadius:9,border:`1px solid ${T.accentBorder}`,background:"rgba(255,255,255,0.07)",color:"#fff",fontSize:14,fontFamily:"sans-serif",boxSizing:"border-box",outline:"none"},
  };

  const TEAMS_BY_KREDITU = [...TEAMS].sort((a,b)=>(kOf(b)||0)-(kOf(a)||0));
  const filteredTeams=(groupFilter==="Todos"?TEAMS_BY_KREDITU:GROUPS[groupFilter]||[]).filter(t=>t.toLowerCase().includes(searchTeam.toLowerCase()));
  const filteredPlayers=(playerList).filter(p=>p.toLowerCase().includes(searchPlayer.toLowerCase()));

  // ── Helper goles jugadores — función normal, NO componente React (evita re-mount y pérdida de foco) ──
  const pgBlock = (matchId)=>{
    const r = getResult(matchId);
    const pl = playerList || DEFAULT_PLAYERS;
    const search = pgSearch[matchId]||"";
    const filtered = search.trim().length>0 ? pl.filter(p=>norm(p).includes(norm(search))).slice(0,6) : [];
    const grouped = Object.entries(((r?.playerGoals)||[]).reduce((a,g)=>{a[g.player]=(a[g.player]||0)+1;return a},{}));
    return(
      <div style={{borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:8,marginTop:8}}>
        <div style={{fontSize:11,fontFamily:"sans-serif",color:"#d4af37",marginBottom:6}}>⚽ Goles de jugadores:</div>
        <div style={{position:"relative",marginBottom:6}}>
          <div style={{display:"flex",gap:6}}>
            <input value={search}
              onChange={e=>setPgSearch(s=>({...s,[matchId]:e.target.value}))}
              placeholder="Buscar jugador..."
              style={{...S.input,flex:1,padding:"7px 10px",fontSize:12}}/>
            <button onMouseDown={e=>{e.preventDefault();if(search.trim()){addPG(matchId,search.trim());setPgSearch(s=>({...s,[matchId]:""}));}}}
              style={{padding:"7px 14px",borderRadius:8,border:"none",cursor:"pointer",background:"rgba(212,175,55,0.2)",color:"#d4af37",fontSize:18,flexShrink:0}}>+</button>
          </div>
          {filtered.length>0&&(
            <div style={{position:"absolute",top:"100%",left:0,right:40,background:"#1a2535",border:"1px solid rgba(212,175,55,0.3)",borderRadius:8,zIndex:50,boxShadow:"0 4px 16px rgba(0,0,0,0.5)"}}>
              {filtered.map(p=>{
                const select=()=>{addPG(matchId,p);setPgSearch(s=>({...s,[matchId]:""}));};
                return <div key={p}
                  onMouseDown={e=>{e.preventDefault();select();}}
                  onTouchEnd={e=>{e.preventDefault();select();}}
                  style={{padding:"10px 12px",fontFamily:"sans-serif",fontSize:13,color:"#ddd",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                  {p}
                </div>;
              })}
            </div>
          )}
        </div>
        {grouped.length>0&&(
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {grouped.map(([pl,n])=>(
              <button key={pl} onMouseDown={e=>{e.preventDefault();removePG(matchId,pl);}}
                style={{background:"rgba(123,47,255,0.15)",padding:"3px 9px",borderRadius:15,fontSize:11,fontFamily:"sans-serif",color:"#b0a0ff",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                {pl} ({n}⚽) <span style={{color:"#ff6b6b",fontSize:10}}>×</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Render partido bracket ────────────────────────────────────────────────
  // Emparejamientos automáticos calculados en tiempo real
  const bracketAuto = calcBracket(state.matches);

  // Obtiene el equipo auto para un partido (si no hay resultado manual guardado)
  const autoTeam = (matchId, slot) => {
    const auto = bracketAuto[matchId];
    return auto?.[slot] || null;
  };

  // Ordena partidos eliminatorios cronológicamente por fecha y hora
  const MONTH_NUM = {"Jun":6,"Jul":7,"Ago":8};
  const bracketSortKey = m => {
    const parts = (m.date||"").split(" ");
    const day = parseInt(parts[0])||0;
    const mon = MONTH_NUM[parts[1]]||0;
    const [h,min] = (m.time||"00:00").split(":").map(Number);
    // Orden simple: mes → día → hora. Las 03:00 del día 29 van antes que las 19:00 del día 29.
    return mon * 1000000 + day * 10000 + h * 100 + (min||0);
  };
  const sortBracket = arr => [...arr].sort((a,b) => bracketSortKey(a) - bracketSortKey(b));

  // Avatar fantasy para jugadores — color único por nombre
  const playerAvatar = (name) => {
    let hash = 0;
    for(let i=0;i<name.length;i++) hash = name.charCodeAt(i) + ((hash<<5)-hash);
    const hue = Math.abs(hash) % 360;
    const initials = name.split(" ").map(w=>w[0]||"").slice(0,2).join("").toUpperCase();
    return { hue, initials };
  };

  const renderBracket = m=>{
    const r=getResult(m.id); const isE=editMatch===m.id;
    const autoT1 = autoTeam(m.id,"team1");
    const autoT2 = autoTeam(m.id,"team2");
    // Equipo efectivo: resultado guardado > auto calculado
    const effT1 = r?.team1 || autoT1;
    const effT2 = r?.team2 || autoT2;
    return(
      <div key={m.id} style={{...S.card,border:r?"1px solid rgba(212,175,55,0.25)":autoT1?"1px solid rgba(76,175,80,0.2)":"1px solid rgba(255,255,255,0.08)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{flex:1}}>
            <div style={{fontSize:10,fontFamily:"sans-serif",color:"#d4af37",marginBottom:2}}>{m.label} · {m.date}{m.time?` · ${m.time}h`:""}</div>
            <div style={{fontFamily:"sans-serif",fontSize:12,color:"#777",marginBottom:2}}>{m.desc}</div>
            {/* Equipos: resultado real o auto-calculados */}
            {(effT1||effT2)&&(
              <div style={{marginTop:2}}>
                <div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:14,color:r?"#fff":"#a0d0a0",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <span>{flag(effT1)} {effT1||"?"}</span>
                  {r?<span style={{color:"#d4af37"}}>{r.score1}–{r.score2}</span>:<span style={{color:"#555",fontWeight:"normal",fontSize:12}}>vs</span>}
                  <span>{effT2||"?"} {flag(effT2)}</span>
                  {r?.penWinner&&<span style={{fontSize:10,color:"#888"}}>(pen:{r.penWinner})</span>}
                  {!r&&autoT1&&<span style={{fontSize:10,color:"#4caf50",fontWeight:"normal"}}>auto ✓</span>}
                </div>
                {!porra.hideTeams&&effT1&&(()=>{const names=participants.filter(p=>p.teams?.includes(effT1)).map(p=>p.name);return names.length>0?<button onClick={e=>{e.stopPropagation();setPickerPopup({team:effT1,names,x:e.clientX,y:e.clientY});}} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,padding:"0 2px",opacity:0.7,display:"inline"}}>👥</button>:null;})()}
              </div>
            )}
            {r?.playerGoals?.length>0&&<div style={{fontSize:10,fontFamily:"sans-serif",color:"#a0c0ff",marginTop:2}}>
              ⚽ {Object.entries((r.playerGoals||[]).reduce((a,g)=>{a[g.player]=(a[g.player]||0)+1;return a},{})).map(([p,n])=>`${p}(${n})`).join(", ")}
            </div>}
          </div>
          {adminUnlocked&&<div style={{display:"flex",gap:5,alignItems:"center"}}>
            {r&&!isE&&<button onClick={()=>setConfirmDialog({msg:`¿Eliminar resultado de ${effT1||"?"} vs ${effT2||"?"}?`,onOk:()=>resetMatch(m.id)})} style={{padding:"4px 8px",borderRadius:8,border:"1px solid rgba(255,50,50,0.3)",background:"rgba(255,50,50,0.08)",color:"#ff6b6b",fontSize:11,cursor:"pointer"}}>🔄</button>}
            <button onClick={()=>{ setEditMatch(isE?null:m.id); if(!isE){ setScores(s=>({...s,[m.id+"_t1"]:r?.team1||autoT1||"",[m.id+"_t2"]:r?.team2||autoT2||""})); } }} style={{...S.btn(isE),padding:"5px 11px",fontSize:11}}>{isE?"×":r?"Editar":"+ Resultado"}</button>
          </div>}
        </div>
        {isE&&adminUnlocked&&(
          <div style={{marginTop:10}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:6,marginBottom:7,alignItems:"center"}}>
              {/* Equipo 1 */}
              <div style={{position:"relative"}}>
                <input
                  value={t1Search[m.id]!==undefined ? t1Search[m.id] : (scores[m.id+"_t1"]||r?.team1||autoT1||"")}
                  onChange={e=>{
                    setT1Search(s=>({...s,[m.id]:e.target.value}));
                    setScores(s=>({...s,[m.id+"_t1"]:e.target.value}));
                  }}
                  onBlur={()=>setTimeout(()=>setT1Search(s=>({...s,[m.id]:undefined})),200)}
                  placeholder="Equipo 1" style={{...S.input,fontSize:12,padding:"8px"}}/>
                {t1Search[m.id]!==undefined && t1Search[m.id].trim().length>0&&(()=>{
                  const f=TEAMS.filter(t=>norm(t).includes(norm(t1Search[m.id]))).slice(0,6);
                  return f.length>0?<div style={{position:"absolute",top:"100%",left:0,right:0,background:"#1a2535",border:"1px solid rgba(212,175,55,0.3)",borderRadius:8,zIndex:100,boxShadow:"0 4px 16px rgba(0,0,0,0.6)"}}>
                    {f.map(t=>{
                      const select=()=>{
                        setScores(s=>({...s,[m.id+"_t1"]:t}));
                        setT1Search(s=>({...s,[m.id]:undefined}));
                      };
                      return <div key={t}
                        onMouseDown={e=>{e.preventDefault();select();}}
                        onTouchEnd={e=>{e.preventDefault();select();}}
                        style={{padding:"11px 13px",fontFamily:"sans-serif",fontSize:14,color:"#ddd",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                        {t}
                      </div>;
                    })}
                  </div>:null;
                })()}
              </div>
              <span style={{color:"#444",textAlign:"center"}}>vs</span>
              {/* Equipo 2 */}
              <div style={{position:"relative"}}>
                <input
                  value={t2Search[m.id]!==undefined ? t2Search[m.id] : (scores[m.id+"_t2"]||r?.team2||autoT2||"")}
                  onChange={e=>{
                    setT2Search(s=>({...s,[m.id]:e.target.value}));
                    setScores(s=>({...s,[m.id+"_t2"]:e.target.value}));
                  }}
                  onBlur={()=>setTimeout(()=>setT2Search(s=>({...s,[m.id]:undefined})),200)}
                  placeholder="Equipo 2" style={{...S.input,fontSize:12,padding:"8px"}}/>
                {t2Search[m.id]!==undefined && t2Search[m.id].trim().length>0&&(()=>{
                  const f=TEAMS.filter(t=>norm(t).includes(norm(t2Search[m.id]))).slice(0,6);
                  return f.length>0?<div style={{position:"absolute",top:"100%",left:0,right:0,background:"#1a2535",border:"1px solid rgba(212,175,55,0.3)",borderRadius:8,zIndex:100,boxShadow:"0 4px 16px rgba(0,0,0,0.6)"}}>
                    {f.map(t=>{
                      const select=()=>{
                        setScores(s=>({...s,[m.id+"_t2"]:t}));
                        setT2Search(s=>({...s,[m.id]:undefined}));
                      };
                      return <div key={t}
                        onMouseDown={e=>{e.preventDefault();select();}}
                        onTouchEnd={e=>{e.preventDefault();select();}}
                        style={{padding:"11px 13px",fontFamily:"sans-serif",fontSize:14,color:"#ddd",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                        {t}
                      </div>;
                    })}
                  </div>:null;
                })()}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:6,marginBottom:7,alignItems:"center"}}>
              <input type="number" min="0" placeholder="0" value={scores[m.id+"_1"]??r?.score1??""} onChange={e=>setScores(s=>({...s,[m.id+"_1"]:e.target.value}))} style={{...S.input,textAlign:"center",padding:"8px"}}/>
              <span style={{color:"#444",textAlign:"center",fontWeight:"bold"}}>–</span>
              <input type="number" min="0" placeholder="0" value={scores[m.id+"_2"]??r?.score2??""} onChange={e=>setScores(s=>({...s,[m.id+"_2"]:e.target.value}))} style={{...S.input,textAlign:"center",padding:"8px"}}/>
            </div>
            <select value={pens[m.id]||""} onChange={e=>setPens(p=>({...p,[m.id]:e.target.value}))} style={{...S.input,marginBottom:7,fontSize:12}}>
              <option value="">Sin penaltis</option>
              {[scores[m.id+"_t1"]||r?.team1,scores[m.id+"_t2"]||r?.team2].filter(Boolean).map(t=><option key={t} value={t}>{t} gana penaltis</option>)}
            </select>
            <button onClick={()=>saveResult(m.id,m.phase,scores[m.id+"_t1"]||r?.team1||autoT1||"",scores[m.id+"_t2"]||r?.team2||autoT2||"")}
              style={{width:"100%",padding:"9px",borderRadius:9,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#4caf50,#087f23)",color:"#fff",fontSize:13,fontWeight:"bold",fontFamily:"sans-serif"}}>
              ✓ Guardar resultado
            </button>
            {pgBlock(m.id)}
          </div>
        )}
      </div>
    );
  };

  if(!loaded) return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#070714 0%,#0d1520 60%,#14081e 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}`}</style>
      <div style={{fontSize:80,animation:"spin 1.5s linear infinite"}}>⚽</div>
      <div style={{color:"#d4af37",fontFamily:"sans-serif",fontSize:18,fontWeight:"bold",letterSpacing:3,animation:"pulse 1.5s ease-in-out infinite"}}>PORRA MUNDIAL 2026</div>
      <div style={{color:"#555",fontFamily:"sans-serif",fontSize:12,letterSpacing:1}}>EE.UU. · México · Canadá</div>
    </div>
  );

  // ── Selector de porra ────────────────────────────────────────────────────
  if(!activePorra) return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#070714 0%,#0d1520 60%,#14081e 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px",gap:24}}>
      <div style={{fontSize:64}}>⚽</div>
      <div style={{textAlign:"center"}}>
        <div style={{fontFamily:"sans-serif",fontSize:11,letterSpacing:4,color:"#555",textTransform:"uppercase",marginBottom:6}}>Copa Mundial 2026</div>
        <div style={{fontFamily:"Georgia",fontSize:26,fontWeight:"bold",color:"#fff",marginBottom:4}}>¿A qué porra entras?</div>
        <div style={{width:40,height:2,background:"#333",margin:"0 auto"}}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12,width:"100%",maxWidth:320}}>
        {Object.values(THEMES).map(t=>(
          <button key={t.id} onClick={()=>setActivePorra(t.id)} style={{
            padding:"20px",borderRadius:16,border:`1px solid ${t.accentBorder}`,cursor:"pointer",
            background:t.accent||"rgba(255,255,255,0.05)",
            display:"flex",alignItems:"center",gap:16,textAlign:"left"
          }}>
            <span style={{fontSize:36}}>{t.emoji}</span>
            <div>
              <div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:18,color:"#fff"}}>{t.name}</div>
              <div style={{fontFamily:"sans-serif",fontSize:12,color:"#666",marginTop:2}}>Mundial 2026 · 80 créditos · 12 selecciones</div>
            </div>
          </button>
        ))}
      </div>
      {adminUnlocked&&<div style={{fontFamily:"sans-serif",fontSize:11,color:"#555",marginTop:8}}>Los resultados son compartidos entre las dos porras</div>}
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'Georgia',serif",color:"#f0e6d3"}}>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",background:T.radial,zIndex:0}}/>
      {toast&&<div style={{position:"fixed",top:18,left:"50%",transform:"translateX(-50%)",background:toast.type==="err"?"#6b1a1a":"#1a3d1a",color:"#fff",padding:"10px 22px",borderRadius:10,zIndex:9999,fontSize:14,fontFamily:"sans-serif",border:`1px solid ${toast.type==="err"?"#ff6b6b":"#4caf50"}`}}>{toast.msg}</div>}

      <div style={{position:"relative",zIndex:1,maxWidth:480,margin:"0 auto",paddingBottom:90}}>

        {/* HEADER */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 14px 6px",gap:8}}>
          {/* Botón Registrarse */}
          <button onClick={()=>setView("register")} style={{
            padding:"7px 12px",borderRadius:20,border:"none",cursor:"pointer",
            background:view==="register"?T.primary:porra.registrationClosed&&!adminUnlocked?"rgba(255,100,100,0.2)":T.joinBg||T.primaryGrad,
            color:porra.registrationClosed&&!adminUnlocked?"#ff9a9a":T.joinTxt||"#000",fontSize:12,fontWeight:"bold",fontFamily:"sans-serif",
            boxShadow:porra.registrationClosed&&!adminUnlocked?"none":`0 2px 10px ${T.primaryGlow}`,
            flexShrink:0, whiteSpace:"nowrap",
            border:porra.registrationClosed&&!adminUnlocked?"1px solid rgba(255,100,100,0.3)":"none"
          }}>{porra.registrationClosed&&!adminUnlocked?"🔒 Cerrado":"✏️ Unirse"}</button>

          {/* Título central */}
          <div style={{textAlign:"center",flex:1}}>
            <h1 style={{margin:0,fontSize:18,fontWeight:"bold",color:"#fff",letterSpacing:-0.5,lineHeight:1.2}}>
              {T.emoji} {T.name}
            </h1>
            <div style={{width:30,height:2,background:T.primaryGrad,margin:"4px auto 0"}}/>
            {/* Botón cambiar de porra — solo si no vino por URL directa */}
            {!new URLSearchParams(window.location.search).get("porra")&&(
              <button onClick={()=>setActivePorra(null)} style={{marginTop:4,padding:"2px 8px",borderRadius:10,border:`1px solid ${T.accentBorder}`,background:"transparent",color:T.primary,fontFamily:"sans-serif",fontSize:10,cursor:"pointer"}}>
                ↩ Cambiar porra
              </button>
            )}
          </div>

          {/* Botones Admin + Premios */}
          <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
            <button onClick={()=>setView("admin")} style={{
              padding:"6px 11px",borderRadius:18,border:"1px solid rgba(255,255,255,0.15)",cursor:"pointer",
              background:view==="admin"?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.07)",
              color:view==="admin"?"#fff":"#999",fontSize:11,fontWeight:"bold",fontFamily:"sans-serif",
              whiteSpace:"nowrap"
            }}>🔧 Admin</button>
            <button onClick={()=>setView("premios")} style={{
              padding:"6px 11px",borderRadius:18,border:`1px solid ${T.accentBorder}`,cursor:"pointer",
              background:view==="premios"?`${T.primary}33`:"rgba(255,255,255,0.04)",
              color:view==="premios"?T.primary:"#888",fontSize:11,fontWeight:"bold",fontFamily:"sans-serif",
              whiteSpace:"nowrap"
            }}>🏅 Premios</button>
          </div>
        </div>

        {/* NAV — sin registro ni admin */}
        <div style={{display:"flex",gap:4,padding:"7px 12px",overflowX:"auto"}}>
          {[
            {id:"home",label:"Inicio"},
            {id:"ranking",label:"Ranking"},
            {id:"partidos",label:"Partidos"},
            {id:"eliminatorias",label:"Eliminatorias"},
            {id:"grupos",label:"Grupos"},
            {id:"goleadores",label:"Goleadores"},
          ].map(n=>(
            <button key={n.id} onClick={()=>setView(n.id)} style={S.btn(view===n.id)}>{n.label}</button>
          ))}
        </div>

        {/* ── HOME ── */}
        {view==="home"&&(
          <div style={{padding:"6px 12px"}}>
            {/* Contador regresivo — se oculta cuando empieza el Mundial */}
            {countdown&&(
            <div style={{...S.card,textAlign:"center",background:"linear-gradient(135deg,rgba(212,175,55,0.1),rgba(255,107,0,0.08))",border:"1px solid rgba(212,175,55,0.25)",marginBottom:8,padding:"14px"}}>
              <div style={{fontFamily:"sans-serif",fontSize:10,color:"#888",letterSpacing:3,textTransform:"uppercase",marginBottom:6}}>Inicio del Mundial</div>
              <div style={{fontSize:24,fontWeight:"bold",color:"#fff",fontFamily:"monospace",letterSpacing:2}}>{countdown}</div>
              <div style={{fontFamily:"sans-serif",fontSize:11,color:"#666",marginTop:4}}>11 Jun 2026 · 19:00h · Ciudad de México</div>
            </div>
            )}
            {/* ── Tablón de avisos ── */}
            {(porra.avisos||[]).filter(a=>!a.hidden).length>0&&(
              <div style={{marginBottom:8}}>
                {(porra.avisos||[]).filter(a=>!a.hidden).map((a,i)=>{
                  const colors = {
                    info:  {bg:"rgba(100,150,255,0.1)",  border:"rgba(100,150,255,0.3)",  icon:"📢", title:"#a0b8ff"},
                    warning:{bg:"rgba(255,180,0,0.1)",   border:"rgba(255,180,0,0.3)",    icon:"⚠️", title:"#ffd060"},
                    success:{bg:"rgba(76,175,80,0.1)",   border:"rgba(76,175,80,0.3)",    icon:"✅", title:"#a8d8a8"},
                  };
                  const col = colors[a.tipo]||colors.info;
                  return(
                    <div key={a.id} style={{background:col.bg,border:`1px solid ${col.border}`,borderRadius:12,padding:"12px 14px",marginBottom:6}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:a.texto?4:0}}>
                        <span style={{fontSize:16}}>{col.icon}</span>
                        <span style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:14,color:col.title,flex:1}}>{a.titulo}</span>
                        <span style={{fontFamily:"sans-serif",fontSize:10,color:"#555"}}>{a.fecha}</span>
                      </div>
                      {a.texto&&<div style={{fontFamily:"sans-serif",fontSize:13,color:"#ccc",lineHeight:1.5,paddingLeft:24}}>{a.texto}</div>}
                    </div>
                  );
                })}
              </div>
            )}
            {!(porra.homeHidden?.comoFunciona) && <div style={S.card}>
              <h2 style={{margin:"0 0 10px",fontSize:16,color:"#d4af37"}}>¿Cómo funciona?</h2>
              {[["⚽","Elige 12 selecciones del Mundial 2026"],["🌟","Elige 3 jugadores estrella"],["📈","Acumula puntos partido a partido"],["🏆","Compite en ranking general y por fase"]].map(([ic,tx])=>(
                <div key={tx} style={{display:"flex",gap:10,alignItems:"center",marginBottom:6,fontFamily:"sans-serif",fontSize:13,color:"#ccc"}}><span style={{fontSize:17}}>{ic}</span><span>{tx}</span></div>
              ))}
            </div>}
            {!(porra.homeHidden?.puntuacion) && <div style={{...S.card,border:"1px solid rgba(255,107,0,0.2)"}}>
              <h2 style={{margin:"0 0 10px",fontSize:16,color:"#ff9a4a"}}>Puntuación</h2>
              {[["Victoria de tu equipo","+3"],["Empate de tu equipo","+1"],["Gol a favor","+0.5"],["Gol en contra","−0.25"],["Tu equipo pasa de fase","+2"],["Gol de tu jugador","+0.75"],["Tu equipo gana la final","+8"]].map(([l,p])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.05)",fontFamily:"sans-serif",fontSize:12}}>
                  <span style={{color:"#bbb"}}>{l}</span><span style={{fontWeight:"bold",color:p.startsWith("−")?"#ff6b6b":"#4caf50"}}>{p} pts</span>
                </div>
              ))}
            </div>}
            <div style={{fontFamily:"sans-serif",fontSize:12,color:"#666",textAlign:"center",marginBottom:8}}>{participants.length} participante{participants.length!==1?"s":""} registrado{participants.length!==1?"s":""}</div>
            {!(porra.homeHidden?.creditos) && <div style={{...S.card,border:"1px solid rgba(76,175,80,0.2)",marginBottom:8}}>
              <h2 style={{margin:"0 0 10px",fontSize:16,color:"#4caf50"}}>💰 Sistema de Créditos</h2>
              <div style={{fontFamily:"sans-serif",fontSize:12,color:"#bbb",marginBottom:8}}>Cada participante dispone de <b style={{color:"#fff"}}>80 créditos</b> para elegir 12 selecciones. Los créditos sobrantes se convierten en puntos extra.</div>
              {[
                {k:13,t:"España, Francia, Argentina, Inglaterra",r:"máx. 1"},
                {k:11,t:"Brasil, Marruecos, Alemania, P. Bajos, Bélgica, Portugal",r:"máx. 1"},
                {k:9,t:"México, EE.UU., Uruguay, Senegal, Colombia, Croacia",r:"libre"},
                {k:7,t:"Suiza, Turquía, Japón, Irán, Austria",r:"libre"},
                {k:5,t:"Corea del Sur, Australia, Ecuador, Suecia, Egipto, Noruega, Argelia",r:"libre"},
                {k:3,t:"Rep. Checa, Canadá, Escocia, Paraguay, C. Marfil, Túnez, Panamá",r:"libre"},
                {k:2,t:"Sudáfrica, Bosnia, Catar, Arabia Saudí, Irak, RD Congo, Uzbekistán",r:"libre"},
                {k:1,t:"Haití, Curazao, Nueva Zelanda, Cabo Verde, Jordania, Ghana",r:"libre"},
              ].map(row=>(
                <div key={row.k} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                  <span style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:13,color:"#d4af37",minWidth:28,flexShrink:0}}>{row.k}k</span>
                  <span style={{fontFamily:"sans-serif",fontSize:11,color:"#aaa",flex:1}}>{row.t}</span>
                  {row.r!=="libre"&&<span style={{fontFamily:"sans-serif",fontSize:10,color:"#ff9a4a",flexShrink:0}}>{row.r}</span>}
                </div>
              ))}
            </div>}
            <button onClick={()=>setView("register")} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#d4af37,#ff6b00)",color:"#000",fontSize:15,fontWeight:"bold",fontFamily:"sans-serif"}}>¡Unirse a la porra!</button>
          </div>
        )}

        {view==="register"&&(
          <div style={{padding:"6px 12px"}}>
            {/* Registro cerrado para no-admin */}
            {porra.registrationClosed && !adminUnlocked ? (
              <div style={{...S.card,textAlign:"center",padding:"40px 20px",border:"1px solid rgba(255,100,100,0.2)"}}>
                <div style={{fontSize:40,marginBottom:12}}>🔒</div>
                <div style={{fontFamily:"sans-serif",fontSize:16,color:"#fff",fontWeight:"bold",marginBottom:8}}>Registro cerrado</div>
                <div style={{fontFamily:"sans-serif",fontSize:13,color:"#888"}}>El administrador ha cerrado el plazo de inscripción. Contacta con el organizador si tienes algún problema.</div>
              </div>
            ) : (<>
            <div style={{display:"flex",gap:5,marginBottom:12}}>
              {["Nombre","Equipos","Jugadores"].map((s,i)=>(
                <div key={s} style={{flex:1,textAlign:"center"}}>
                  <div style={{height:3,borderRadius:2,marginBottom:3,background:regStep>i?"linear-gradient(90deg,#d4af37,#ff6b00)":"rgba(255,255,255,0.1)"}}/>
                  <span style={{fontSize:10,fontFamily:"sans-serif",color:regStep>i?"#d4af37":"#555"}}>{s}</span>
                </div>
              ))}
            </div>
            {regStep===1&&(
              <div style={S.card}>
                <h2 style={{margin:"0 0 12px",fontSize:18}}>¿Cómo te llamas?</h2>
                <input value={newUser.name} onChange={e=>setNewUser(u=>({...u,name:e.target.value}))} placeholder="Tu nombre o alias..." style={S.input}/>
                <button onClick={()=>newUser.name.trim()?setRegStep(2):toast_("Escribe tu nombre","err")} style={{width:"100%",marginTop:10,padding:"12px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#d4af37,#ff6b00)",color:"#000",fontSize:14,fontWeight:"bold",fontFamily:"sans-serif",cursor:"pointer"}}>Siguiente →</button>
              </div>
            )}
            {regStep===2&&(()=>{
              const spent = newUser.teams.reduce((s,t)=>s+kOf(t),0);
              const remaining = MAX_KREDITU - spent;
              const has13 = newUser.teams.filter(t=>kOf(t)===13).length;
              const has11 = newUser.teams.filter(t=>kOf(t)===11).length;
              const pct = Math.min(100, Math.round((spent/MAX_KREDITU)*100));
              const canAdd = (t) => {
                if(newUser.teams.includes(t)) return true; // ya seleccionado, se puede deseleccionar
                if(newUser.teams.length>=12) return false;
                if(kOf(t)>remaining) return false;
                if(kOf(t)===13 && has13>=1) return false;
                if(kOf(t)===11 && has11>=1) return false;
                return true;
              };
              return(
              <div>
                <div style={S.card}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <h2 style={{margin:0,fontSize:16}}>Elige 12 equipos</h2>
                    <span style={{background:newUser.teams.length===12?"rgba(76,175,80,0.2)":"rgba(212,175,55,0.1)",color:newUser.teams.length===12?"#4caf50":"#d4af37",padding:"3px 10px",borderRadius:20,fontSize:12,fontFamily:"sans-serif",fontWeight:"bold"}}>{newUser.teams.length}/12</span>
                  </div>
                  {/* Contador créditos */}
                  <div style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <span style={{fontFamily:"sans-serif",fontSize:12,color:"#aaa"}}>Créditos gastados: <b style={{color:"#fff"}}>{spent}</b> / {MAX_KREDITU}</span>
                      <span style={{fontFamily:"sans-serif",fontSize:13,fontWeight:"bold",color:remaining>0?"#4caf50":remaining===0?"#d4af37":"#ff6b6b"}}>
                        {remaining>0?`${remaining}k sobrante → +${remaining} pts`:remaining===0?"¡Justo! ✓":"¡Pasado!"}
                      </span>
                    </div>
                    {/* Barra créditos */}
                    <div style={{height:6,background:"rgba(255,255,255,0.08)",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,borderRadius:3,transition:"width 0.2s",background:remaining<0?"#ff6b6b":remaining===0?"#d4af37":"linear-gradient(90deg,#4caf50,#d4af37)"}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:2,fontFamily:"sans-serif",fontSize:10,color:"#555"}}>
                      <span>0k</span><span>40k</span><span>80k</span>
                    </div>
                  </div>
                  {/* Restricciones */}
                  <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                    <span style={{fontSize:11,fontFamily:"sans-serif",padding:"3px 9px",borderRadius:10,background:has13>=1?"rgba(76,175,80,0.15)":"rgba(255,255,255,0.06)",color:has13>=1?"#4caf50":"#888"}}>
                      13k: {has13}/1 {has13>=1?"✓":""}
                    </span>
                    <span style={{fontSize:11,fontFamily:"sans-serif",padding:"3px 9px",borderRadius:10,background:has11>=1?"rgba(76,175,80,0.15)":"rgba(255,255,255,0.06)",color:has11>=1?"#4caf50":"#888"}}>
                      11k: {has11}/1 {has11>=1?"✓":""}
                    </span>
                  </div>
                  <input value={searchTeam} onChange={e=>setSearchTeam(e.target.value)} placeholder="Buscar..." style={{...S.input,marginBottom:7}}/>
                  <div style={{display:"flex",gap:4,marginBottom:8,overflowX:"auto",paddingBottom:2}}>
                    {["Todos",...Object.keys(GROUPS)].map(g=>(
                      <button key={g} onClick={()=>setGroupFilter(g)} style={{padding:"4px 10px",borderRadius:15,border:"none",cursor:"pointer",fontSize:11,fontFamily:"sans-serif",fontWeight:600,whiteSpace:"nowrap",background:groupFilter===g?"rgba(212,175,55,0.25)":"rgba(255,255,255,0.05)",color:groupFilter===g?"#d4af37":"#777"}}>
                        {g==="Todos"?"Todos":`G.${g}`}
                      </button>
                    ))}
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5,maxHeight:230,overflowY:"auto"}}>
                    {filteredTeams.map(t=>{
                      const sel = newUser.teams.includes(t);
                      const ok = canAdd(t);
                      const k = kOf(t);
                      return(
                        <button key={t} onClick={()=>{
                          if(!sel && !ok) return;
                          setNewUser(u=>{
                            if(u.teams.includes(t)) return {...u,teams:u.teams.filter(x=>x!==t)};
                            if(!canAdd(t)) return u;
                            if(u.teams.length>=12){toast_("Máximo 12 equipos","err");return u;}
                            return {...u,teams:[...u.teams,t]};
                          });
                        }} style={{
                          padding:"6px 10px",borderRadius:18,border:"none",cursor:ok||sel?"pointer":"not-allowed",
                          fontSize:12,fontFamily:"sans-serif",display:"flex",alignItems:"center",gap:5,
                          background:sel?"linear-gradient(135deg,#d4af37,#ff6b00)":ok?"rgba(255,255,255,0.07)":"rgba(255,255,255,0.03)",
                          color:sel?"#000":ok?"#ccc":"#444",
                          fontWeight:sel?"bold":"normal",
                          opacity:ok||sel?1:0.4
                        }}>
                          {t}
                          <span style={{fontSize:10,fontWeight:"bold",color:sel?"rgba(0,0,0,0.6)":ok?"#d4af37":"#555",background:sel?"rgba(0,0,0,0.15)":"rgba(212,175,55,0.1)",padding:"1px 5px",borderRadius:8}}>{k}k</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Equipos seleccionados */}
                  {newUser.teams.length>0&&<div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:3}}>
                    {newUser.teams.map(t=>(
                      <span key={t} style={{background:"rgba(212,175,55,0.15)",padding:"2px 8px",borderRadius:10,fontSize:11,fontFamily:"sans-serif",color:"#d4af37",display:"flex",alignItems:"center",gap:4}}>
                        {t} <span style={{color:"#888"}}>{kOf(t)}k</span>
                        <span onClick={()=>setNewUser(u=>({...u,teams:u.teams.filter(x=>x!==t)}))} style={{cursor:"pointer",color:"#ff6b6b",marginLeft:2}}>×</span>
                      </span>
                    ))}
                  </div>}
                </div>
                <div style={{display:"flex",gap:7}}>
                  <button onClick={()=>setRegStep(1)} style={{flex:1,padding:"11px",borderRadius:10,border:"1px solid rgba(255,255,255,0.12)",background:"transparent",color:"#aaa",fontFamily:"sans-serif",cursor:"pointer"}}>← Atrás</button>
                  <button onClick={()=>{
                    if(newUser.teams.length!==12) return toast_("Elige exactamente 12 equipos","err");
                    if(remaining<0) return toast_("Te has pasado de 80 créditoss","err");
                    setRegStep(3);
                  }} style={{flex:2,padding:"11px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#d4af37,#ff6b00)",color:"#000",fontWeight:"bold",fontFamily:"sans-serif",cursor:"pointer"}}>Siguiente →</button>
                </div>
              </div>
              );
            })()}
            {regStep===3&&(
              <div>
                <div style={S.card}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <h2 style={{margin:0,fontSize:16}}>Elige 3 jugadores</h2>
                    <span style={{background:newUser.players.length===3?"rgba(76,175,80,0.2)":"rgba(212,175,55,0.1)",color:newUser.players.length===3?"#4caf50":"#d4af37",padding:"3px 10px",borderRadius:20,fontSize:12,fontFamily:"sans-serif",fontWeight:"bold"}}>{newUser.players.length}/3</span>
                  </div>
                  <input value={searchPlayer} onChange={e=>setSearchPlayer(e.target.value)} placeholder="Buscar jugador..." style={{...S.input,marginBottom:8}}/>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5,maxHeight:220,overflowY:"auto"}}>
                    {filteredPlayers.map(pl=>{const sel=newUser.players.includes(pl);return(
                      <button key={pl} onClick={()=>setNewUser(u=>({...u,players:toggle(u.players,pl,3)}))} style={{padding:"7px 11px",borderRadius:18,border:"none",cursor:"pointer",fontSize:12,fontFamily:"sans-serif",background:sel?"linear-gradient(135deg,#7b2fff,#00c6ff)":"rgba(255,255,255,0.07)",color:sel?"#fff":"#ccc",fontWeight:sel?"bold":"normal"}}>{pl}</button>
                    );})}
                  </div>
                </div>
                <div style={{display:"flex",gap:7}}>
                  <button onClick={()=>setRegStep(2)} style={{flex:1,padding:"11px",borderRadius:10,border:"1px solid rgba(255,255,255,0.12)",background:"transparent",color:"#aaa",fontFamily:"sans-serif",cursor:"pointer"}}>← Atrás</button>
                  <button onClick={()=>{
                    if(!newUser.name.trim()) return toast_("Falta el nombre","err");
                    if(newUser.teams.length!==12) return toast_("12 equipos exactos","err");
                    if(newUser.players.length!==3) return toast_("3 jugadores exactos","err");
                    setPorra(p=>({...p,participants:[...p.participants,{...newUser,id:Date.now(),registeredAt:new Date().toLocaleString("es-ES")}]}));
                    setNewUser({name:"",teams:[],players:[]}); setRegStep(1); setView("ranking");
                    toast_(`¡${newUser.name} registrado! 🎉`);
                    addLog(`👤 Nuevo participante: ${newUser.name}`);
                  }} style={{flex:2,padding:"11px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#4caf50,#087f23)",color:"#fff",fontWeight:"bold",fontFamily:"sans-serif",cursor:"pointer"}}>¡Confirmar! 🎉</button>
                </div>
              </div>
            )}
            </>)}
          </div>
        )}

        {/* ── RANKING ── */}
        {view==="ranking"&&(
          <div style={{padding:"6px 12px"}}>
            <div style={{display:"flex",gap:5,marginBottom:10,overflowX:"auto",paddingBottom:2}}>
              {["General",...PHASES_LIST].map(ph=>(
                <button key={ph} onClick={()=>setClassPhase(ph)} style={S.btn(classPhase===ph)}>{ph}</button>
              ))}
            </div>
            <div id="ranking-export" style={{background:"#0d1520",borderRadius:12,paddingBottom:4}}>
            {participants.length===0?(
              <div style={{...S.card,textAlign:"center",padding:"36px 20px"}}>
                <div style={{fontSize:36,marginBottom:8}}>🏆</div>
                <div style={{fontFamily:"sans-serif",color:"#666",fontSize:14}}>Nadie registrado aún</div>
              </div>
            ):rankings(classPhase).map((p,i)=>(
              <div key={p.id}>
                <div onClick={()=>setExpandedP(expandedP===p.id?null:p.id)} style={{background:i===0?"linear-gradient(135deg,rgba(212,175,55,0.12),rgba(255,107,0,0.07))":"rgba(255,255,255,0.04)",borderRadius:12,border:i===0?"1px solid rgba(212,175,55,0.3)":"1px solid rgba(255,255,255,0.07)",padding:"12px 14px",display:"flex",alignItems:"center",gap:10,marginBottom:5,cursor:"pointer"}}>
                  <div style={{fontSize:i<3?21:15,minWidth:32,textAlign:"center"}}>{medal(i)}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:"bold",fontSize:14}}>{p.name}</div>
                    {classPhase==="General"&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:3}}>
                        {PHASES_LIST.map(ph=>{
                          const pts=calcScore(p, state.matches, ph);
                          if(!pts) return null;
                          return <span key={ph} style={{fontSize:10,fontFamily:"sans-serif",color:"#888",background:"rgba(255,255,255,0.06)",padding:"1px 6px",borderRadius:10}}>{ph}: <span style={{color:"#d4af37"}}>{pts}</span></span>;
                        })}
                      </div>
                    )}
                  </div>
                  <div style={{fontSize:20,fontWeight:"bold",fontFamily:"sans-serif",color:i===0?"#d4af37":"#fff"}}>{p.score}</div>
                </div>
                {expandedP===p.id&&(
                  <div style={{...S.card,marginTop:-3,marginBottom:6,padding:"12px 14px"}}>
                    <div style={{fontFamily:"sans-serif",fontSize:12}}>
                      {/* Modo secreto: ocultar equipos y jugadores si no es admin */}
                      {porra.hideTeams && !adminUnlocked ? (
                        <div style={{textAlign:"center",padding:"16px 0",color:"#666",fontFamily:"sans-serif",fontSize:13}}>
                          🔒 Equipos y jugadores ocultos hasta que termine el plazo de registro
                        </div>
                      ) : (
                        <>
                      <div style={{color:"#d4af37",fontWeight:"bold",marginBottom:4}}>⚽ Equipos <span style={{color:"#555",fontWeight:"normal",fontSize:10}}>(pulsa para desglose)</span></div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
                        {p.teams.map(t=>{
                          const phase = classPhase==="General" ? null : classPhase;
                          const {totalPts}=calcTeamBreakdown(t, p.players, phase);
                          return(
                            <button key={t} onClick={()=>setTeamDetail({participantId:p.id,team:t,phase})} style={{padding:"4px 10px",borderRadius:14,border:"none",cursor:"pointer",background:"rgba(212,175,55,0.1)",color:"#ddd",fontSize:12,display:"flex",alignItems:"center",gap:5}}>
                              {t}
                              {(()=>{
                                const played=state.matches.filter(m=>m.played&&(m.team1===t||m.team2===t)&&(phase?m.phase===phase:true)).length;
                                if(totalPts!==0||played>0) return <span style={{fontWeight:"bold",color:totalPts>0?"#4caf50":totalPts<0?"#ff6b6b":"#888",fontSize:11}}>{totalPts>0?"+":""}{totalPts}</span>;
                                return null;
                              })()}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{color:"#7b8fff",fontWeight:"bold",marginBottom:4}}>🌟 Jugadores <span style={{color:"#555",fontWeight:"normal",fontSize:10}}>(pulsa para desglose)</span></div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                        {p.players.map(pl=>{
                          const phase = classPhase==="General" ? null : classPhase;
                          const {totalGoals,totalPts}=calcPlayerBreakdown(pl, phase);
                          return(
                            <button key={pl} onClick={()=>setPlayerDetail({participantId:p.id,player:pl,phase})} style={{padding:"4px 10px",borderRadius:14,border:"none",cursor:"pointer",background:"rgba(123,47,255,0.12)",color:"#b0a0ff",fontSize:12,display:"flex",alignItems:"center",gap:5}}>
                              {pl}{totalGoals>0&&<span style={{fontWeight:"bold",color:"#d4af37",fontSize:11}}>{totalGoals}⚽ +{totalPts}</span>}
                            </button>
                          );
                        })}
                      </div>
                      {/* Créditos sobrantes */}
                      {classPhase==="General"&&(()=>{
                        const spent=(p.teams||[]).reduce((s,t)=>s+kOf(t),0);
                        const left=MAX_KREDITU-spent;
                        if(left<=0) return null;
                        return <div style={{marginTop:6,padding:"4px 10px",background:"rgba(76,175,80,0.08)",borderRadius:8,border:"1px solid rgba(76,175,80,0.2)",fontFamily:"sans-serif",fontSize:11,color:"#4caf50"}}>
                          💰 {left}k sobrantes → +{left} pts extra
                        </div>;
                      })()}
                      {/* Ajuste manual visible solo en General */}
                      {classPhase==="General"&&(()=>{
                        const adjs=Array.isArray(p.manualAdjustments)?p.manualAdjustments
                          :(p.manualPts!==undefined&&p.manualPts!==null&&(p.manualPts!==0||p.manualReason))
                            ?[{pts:p.manualPts,reason:p.manualReason||"",date:""}]:[];
                        if(!adjs.length)return null;
                        const tot=adjs.reduce((s,a)=>s+(a.pts||0),0);
                        return(
                          <div style={{marginTop:8,padding:"6px 10px",background:"rgba(255,200,0,0.08)",borderRadius:8,border:"1px solid rgba(255,200,0,0.2)"}}>
                            <div style={{fontFamily:"sans-serif",fontSize:11,color:"#d4af37",marginBottom:adjs.length>1?3:0}}>
                              Ajustes admin: <b style={{color:tot>0?"#4caf50":tot<0?"#ff6b6b":"#888"}}>{tot>0?"+":""}{tot} pts</b>
                            </div>
                            {adjs.map((a,i)=>(
                              <div key={i} style={{fontFamily:"sans-serif",fontSize:11,color:"#888",marginTop:1}}>
                                <span style={{color:a.pts>0?"#4caf50":a.pts<0?"#ff6b6b":"#777"}}>{a.pts>0?"+":""}{a.pts}pts</span>
                                {a.reason&&<span> - {a.reason}</span>}
                                {a.date&&<span style={{color:"#555"}}> · {a.date}</span>}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      {/* Cierre del bloque condicional hideTeams */}
                      </>)}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* ── Tabla comparativa de equipos ── */}
            {!porra.hideTeams && participants.length>0 && (()=>{
              const allTeams = [...new Set(participants.flatMap(p=>p.teams))]
                .sort((a,b)=>(kOf(b)||0)-(kOf(a)||0));
              const parts = rankings(classPhase);

              return(
                <div style={{marginTop:16}}>
                  <div style={{fontFamily:"sans-serif",fontSize:12,color:"#888",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                    <span>👥 Tabla comparativa</span>
                    <span style={{fontSize:10,color:"#555"}}>({allTeams.length} equipos · {parts.length} participantes)</span>
                  </div>
                  <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                    <table style={{borderCollapse:"collapse",fontFamily:"sans-serif",fontSize:11}}>
                      {/* Cabecera — participantes en columnas */}
                      <thead>
                        <tr>
                          {/* Celda esquina */}
                          <td style={{padding:"4px 6px",position:"sticky",left:0,background:"#0d1520",zIndex:2,borderBottom:"1px solid rgba(255,255,255,0.1)",borderRight:"1px solid rgba(255,255,255,0.08)"}}>
                            <span style={{fontFamily:"sans-serif",fontSize:9,color:"#555"}}>Equipo / Participante</span>
                          </td>
                          {parts.map((p,i)=>(
                            <td key={p.id} style={{padding:"3px 2px",textAlign:"center",borderBottom:"1px solid rgba(255,255,255,0.1)",minWidth:28}}>
                              <div style={{transform:"rotate(-45deg)",transformOrigin:"bottom center",whiteSpace:"nowrap",fontSize:9,color:i===0?"#d4af37":"#aaa",height:52,display:"flex",alignItems:"flex-end",justifyContent:"center",paddingBottom:2}}>
                                {i+1}º {p.name.length>7?p.name.slice(0,7)+"…":p.name}
                              </div>
                            </td>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {allTeams.map((t,ti)=>{
                          const count = parts.filter(p=>p.teams.includes(t)).length;
                          const isUnique = count===1;
                          return(
                            <tr key={t} style={{background:ti%2===0?"rgba(255,255,255,0.02)":"transparent"}}>
                              {/* Equipo — sticky izquierda */}
                              <td style={{padding:"4px 6px",whiteSpace:"nowrap",position:"sticky",left:0,background:ti%2===0?"#0e1622":"#0d1520",zIndex:1,borderBottom:"1px solid rgba(255,255,255,0.05)",borderRight:"1px solid rgba(255,255,255,0.08)"}}>
                                <div style={{display:"flex",alignItems:"center",gap:4}}>
                                  <span style={{fontSize:13}}>{flag(t)}</span>
                                  <span style={{color:"#ccc",fontSize:11}}>{t}</span>
                                  <span style={{fontSize:9,color:"#555",marginLeft:2}}>{kOf(t)}k</span>
                                  {count>0&&<span style={{fontSize:9,background:"rgba(255,255,255,0.06)",color:"#777",padding:"0 4px",borderRadius:6,marginLeft:2}}>{count}</span>}
                                </div>
                              </td>
                              {/* Celdas por participante */}
                              {parts.map(p=>{
                                const has = p.teams.includes(t);
                                return(
                                  <td key={p.id} style={{textAlign:"center",padding:"3px 2px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                                    {has?(
                                      <div style={{
                                        width:18,height:18,borderRadius:4,margin:"0 auto",
                                        background:isUnique?"rgba(212,175,55,0.3)":"rgba(76,175,80,0.25)",
                                        border:isUnique?"1px solid rgba(212,175,55,0.5)":"1px solid rgba(76,175,80,0.4)",
                                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:10
                                      }}>
                                        {isUnique?"★":"✓"}
                                      </div>
                                    ):(
                                      <span style={{color:"#333",fontSize:10}}>·</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{display:"flex",gap:12,marginTop:6,paddingLeft:4}}>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <div style={{width:14,height:14,borderRadius:3,background:"rgba(76,175,80,0.25)",border:"1px solid rgba(76,175,80,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9}}>✓</div>
                      <span style={{fontFamily:"sans-serif",fontSize:10,color:"#666"}}>Compartido</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <div style={{width:14,height:14,borderRadius:3,background:"rgba(212,175,55,0.3)",border:"1px solid rgba(212,175,55,0.5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9}}>★</div>
                      <span style={{fontFamily:"sans-serif",fontSize:10,color:"#666"}}>Exclusivo</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontFamily:"sans-serif",fontSize:10,color:"#555"}}>Nº = cuántos lo tienen</span>
                    </div>
                  </div>
                </div>
              );
            })()}
            </div>{/* fin ranking-export */}
          </div>
        )}

        {/* ── GOLEADORES ── */}
        {view==="goleadores"&&(()=>{
          // Si modo secreto activo, ocultar lista
          if(porra.hideTeams && !adminUnlocked) return(
            <div style={{padding:"6px 12px"}}>
              <div style={{textAlign:"center",padding:"40px 20px",fontFamily:"sans-serif"}}>
                <div style={{fontSize:36,marginBottom:12}}>🔒</div>
                <div style={{fontSize:15,color:"#fff",fontWeight:"bold",marginBottom:8}}>Goleadores ocultos</div>
                <div style={{fontSize:13,color:"#888"}}>La lista de goleadores estará visible cuando el administrador desactive el modo secreto.</div>
              </div>
            </div>
          );
          const chosenPlayers = [...new Set(
            participants.flatMap(p=>p.players)
          )].sort();

          // Para cada jugador: total goles, pts, quién lo tiene y en qué partidos marcó
          const goalData = chosenPlayers.map(player=>{
            const totalGoals = state.matches.reduce((sum,m)=>{
              return sum + (m.playerGoals||[]).filter(pg=>norm(pg.player)===norm(player)).length;
            }, 0);
            const owners = participants.filter(p=>p.players.some(pl=>norm(pl)===norm(player))).map(p=>p.name);
            const pts = Math.round(totalGoals * 0.75 * 100) / 100;
            // Buscar selección del jugador en los goles marcados
            let team = "";
            for(const m of state.matches){
              const goal = (m.playerGoals||[]).find(pg=>norm(pg.player)===norm(player));
              if(goal){team=goal.team||"";break;}
            }
            // Si no ha marcado aún, buscar en playerGoals de todos los partidos por nombre similar
            return { player, totalGoals, pts, owners, team };
          }).sort((a,b)=>b.totalGoals-a.totalGoals||a.player.localeCompare(b.player));

          const maxGoals = goalData[0]?.totalGoals || 0;

          return(
            <div style={{padding:"6px 12px"}}>
              <div style={{fontFamily:"sans-serif",fontSize:12,color:"#666",marginBottom:12,textAlign:"center"}}>
                Solo jugadores elegidos por los participantes
              </div>
              {chosenPlayers.length===0?(
                <div style={{...S.card,textAlign:"center",padding:"36px 20px"}}>
                  <div style={{fontSize:32,marginBottom:8}}>⚽</div>
                  <div style={{fontFamily:"sans-serif",color:"#555",fontSize:14}}>Aún no hay participantes registrados</div>
                </div>
              ):goalData.map((d,i)=>{
                const barWidth = maxGoals>0 ? Math.round((d.totalGoals/maxGoals)*100) : 0;
                const isTop = i===0 && d.totalGoals>0;
                return(
                  <div key={d.player} style={{
                    ...S.card,
                    padding:"12px 14px",
                    border: isTop?"1px solid rgba(212,175,55,0.35)":"1px solid rgba(255,255,255,0.07)",
                    background: isTop?"linear-gradient(135deg,rgba(212,175,55,0.1),rgba(255,107,0,0.06))":"rgba(255,255,255,0.04)"
                  }}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{fontSize:i<3&&d.totalGoals>0?20:14,minWidth:28,textAlign:"center",flexShrink:0}}>
                        {d.totalGoals>0?["🥇","🥈","🥉"][i]||`${i+1}º`:"—"}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                          <span style={{fontWeight:"bold",fontSize:15,color:isTop?"#fff":"#ddd"}}>{d.player}</span>
                          {d.team&&<span style={{fontSize:11,color:"#888",fontFamily:"sans-serif",marginLeft:4}}>{flag(d.team)} {d.team}</span>}
                          <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}>
                            <span style={{fontSize:18,color:"#d4af37",fontWeight:"bold"}}>{d.totalGoals}</span>
                            <span style={{fontSize:11,color:"#888",marginLeft:3}}>⚽</span>
                            {d.pts>0&&<span style={{fontSize:12,color:"#4caf50",fontWeight:"bold",marginLeft:6}}>+{d.pts}pts</span>}
                          </div>
                        </div>
                        {maxGoals>0&&(
                          <div style={{height:4,background:"rgba(255,255,255,0.08)",borderRadius:2,marginBottom:5,overflow:"hidden"}}>
                            <div style={{height:"100%",width:`${barWidth}%`,background:isTop?"linear-gradient(90deg,#d4af37,#ff6b00)":"rgba(76,175,80,0.6)",borderRadius:2}}/>
                          </div>
                        )}
                        <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                          {d.owners.map(name=>(
                            <span key={name} style={{fontSize:10,fontFamily:"sans-serif",background:"rgba(123,47,255,0.15)",color:"#b0a0ff",padding:"1px 7px",borderRadius:10}}>{name}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ── PREMIOS ── */}
        {view==="premios"&&(()=>{
          const cfg = porra.premiosConfig || DEFAULT_PREMIOS_CONFIG;
          const PHASES = activePorra==="zumaia" ? ["J1","J2","J3","Dieciseisavos","Octavos","Cuartos","Semifinal"] : ["Grupos","Dieciseisavos","Octavos","Cuartos","Semifinal"];
          const phasePrize = cfg.phasePrize || 5;

          // Calcular bote pakete acumulado de todas las fases
          let totalBotePakete = 0;
          const phaseResults = PHASES.map(phase=>{
            const complete = isPhaseComplete(phase, state.matches);
            const {winners, botePakete} = complete
              ? calcPhasePrize(phase, participants, state.matches, phasePrize)
              : {winners:[], botePakete:0};
            totalBotePakete += botePakete;
            return {phase, complete, winners, botePakete};
          });

          // Clasificación general
          const generalRanked = [...participants]
            .map(p=>({...p, score:calcScore(p, state.matches, null)}))
            .sort((a,b)=>b.score-a.score);

          // Premio general: bote total - (fase × 6) + bote pakete acumulado
          const generalPot = (cfg.boteTotal||300) - PHASES.length * phasePrize;
          const pcts = cfg.generalPct || [45,32,14,9];

          // Último clasificado general → recibe bote pakete
          const lastPlace = generalRanked.length>0 ? generalRanked[generalRanked.length-1] : null;

          const allGeneralComplete = isPhaseComplete("Final", state.matches);

          const phaseIcons = {"Grupos":"⚽","J1":"1️⃣","J2":"2️⃣","J3":"3️⃣","Dieciseisavos":"🔵","Octavos":"🟣","Cuartos":"🟠","Semifinal":"🔴"};

          return(
            <div style={{padding:"6px 12px"}}>

              {/* Bote total */}
              <div style={{display:"flex",gap:6,marginBottom:8}}>
                <div style={{...S.card,flex:1,textAlign:"center",background:"linear-gradient(135deg,rgba(212,175,55,0.12),rgba(255,107,0,0.08))",border:"1px solid rgba(212,175,55,0.3)"}}>
                  <div style={{fontFamily:"sans-serif",fontSize:10,color:"#888",marginBottom:2}}>Bote total</div>
                  <div style={{fontFamily:"sans-serif",fontSize:22,fontWeight:"bold",color:"#d4af37"}}>{cfg.boteTotal||300}€</div>
                </div>
                <div style={{...S.card,flex:1,textAlign:"center",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,100,100,0.2)"}}>
                  <div style={{fontFamily:"sans-serif",fontSize:10,color:"#888",marginBottom:2}}>🎁 Bote Pakete</div>
                  <div style={{fontFamily:"sans-serif",fontSize:22,fontWeight:"bold",color:totalBotePakete>0?"#ff9a4a":"#444"}}>{Math.round(totalBotePakete*100)/100}€</div>
                  {lastPlace&&<div style={{fontFamily:"sans-serif",fontSize:10,color:"#888",marginTop:2}}>→ {lastPlace.name} (último)</div>}
                </div>
              </div>

              {/* Clasificación general */}
              <div style={{...S.card,border:"1px solid rgba(212,175,55,0.3)",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:14,color:"#d4af37"}}>🏆 Clasificación General</div>
                  <div style={{fontFamily:"sans-serif",fontSize:13,fontWeight:"bold",color:"#4caf50"}}>{Math.round(generalPot*100)/100}€</div>
                </div>
                {generalRanked.slice(0,4).map((p,i)=>{
                  const prize = Math.round(generalPot * (pcts[i]||0) / 100 * 100)/100;
                  const isWinner = allGeneralComplete;
                  return(
                    <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                      <span style={{fontSize:i<3?18:14,minWidth:28,textAlign:"center"}}>{["🥇","🥈","🥉","4º"][i]}</span>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"sans-serif",fontSize:13,color:isWinner?"#fff":"#aaa",fontWeight:isWinner?"bold":"normal"}}>{p.name}</div>
                        <div style={{fontFamily:"sans-serif",fontSize:10,color:"#555"}}>{pcts[i]}% del bote</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:15,color:isWinner?"#4caf50":"#888"}}>{prize}€</div>
                      </div>
                    </div>
                  );
                })}
                {generalRanked.length===0&&<div style={{fontFamily:"sans-serif",fontSize:12,color:"#555",textAlign:"center",padding:"12px 0"}}>Sin participantes aún</div>}
              </div>

              {/* Fases */}
              {phaseResults.map(({phase,complete,winners,botePakete})=>{
                const icon = phaseIcons[phase]||"🎯";
                return(
                  <div key={phase} style={{...S.card,border:`1px solid ${complete?"rgba(76,175,80,0.2)":"rgba(255,255,255,0.08)"}`,marginBottom:6}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:complete&&winners.length>0?8:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:18}}>{icon}</span>
                        <div>
                          <div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:13,color:"#ddd"}}>{phase}</div>
                          <div style={{fontFamily:"sans-serif",fontSize:10,color:"#555"}}>{complete?"Fase completada":"En curso..."}</div>
                        </div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        {!complete&&<div style={{fontFamily:"sans-serif",fontSize:14,fontWeight:"bold",color:"#888"}}>{phasePrize}€</div>}
                        {complete&&winners.length===0&&<div style={{fontFamily:"sans-serif",fontSize:12,color:"#ff9a4a"}}>→ Bote Pakete</div>}
                      </div>
                    </div>
                    {complete&&winners.length>0&&(
                      <div>
                        {winners.map((w,wi)=>(
                          <div key={wi} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <span style={{fontSize:14}}>{winners.length>1?"🤝":"🥇"}</span>
                              <span style={{fontFamily:"sans-serif",fontSize:13,color:"#fff",fontWeight:"bold"}}>{w.name}</span>
                            </div>
                            <span style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:14,color:"#4caf50"}}>+{w.prize}€</span>
                          </div>
                        ))}
                        {botePakete>0&&(
                          <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                            <span style={{fontFamily:"sans-serif",fontSize:12,color:"#ff9a4a"}}>→ Bote Pakete</span>
                            <span style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:12,color:"#ff9a4a"}}>+{botePakete}€</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div style={{fontFamily:"sans-serif",fontSize:10,color:"#555",textAlign:"center",marginTop:4}}>
                Los premios de fase se calculan al terminar cada fase · Bote Pakete para el último clasificado
              </div>
            </div>
          );
        })()}

        {/* ── PARTIDOS ── */}
        {view==="partidos"&&(
          <div style={{padding:"6px 12px"}}>
            <div style={{display:"flex",gap:4,marginBottom:10,overflowX:"auto",paddingBottom:2}}>
              {["Todos",...Object.keys(GROUPS)].map(g=>(
                <button key={g} onClick={()=>setGroupFilter(g)} style={S.btn((g==="Todos"&&groupFilter==="Todos")||(groupFilter===g&&g!=="Todos"))}>
                  {g==="Todos"?"Todos":`G.${g}`}
                </button>
              ))}
            </div>
            {(groupFilter==="Todos"?GROUP_MATCHES_CHRONO:GROUP_MATCHES.filter(m=>m.group===groupFilter)).map(m=>{
              const r=getResult(m.id);
              return(
                <div key={m.id} style={{...S.card,border:r?"1px solid rgba(76,175,80,0.15)":"1px solid rgba(255,255,255,0.07)"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{flex:1,textAlign:"right",fontFamily:"sans-serif",fontSize:13,color:"#ddd",display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4}}>
                      <div style={{textAlign:"right"}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4}}>
                          {!porra.hideTeams&&(()=>{const names=participants.filter(p=>p.teams?.includes(m.team1)).map(p=>p.name);return names.length>0?<button onClick={e=>{e.stopPropagation();setPickerPopup({team:m.team1,names,x:e.clientX,y:e.clientY});}} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,padding:"0 2px",opacity:0.7}}>👥</button>:null;})()}
                          <span>{m.team1}</span><span style={{fontSize:18}}>{flag(m.team1)}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{minWidth:60,textAlign:"center",fontFamily:"sans-serif",fontWeight:"bold",fontSize:r?17:13,color:r?"#fff":"#444",background:r?"rgba(255,255,255,0.09)":"rgba(255,255,255,0.03)",padding:"4px 9px",borderRadius:7,margin:"0 7px"}}>
                      {r?`${r.score1}–${r.score2}`:"vs"}
                    </div>
                    <div style={{flex:1,fontFamily:"sans-serif",fontSize:13,color:"#ddd",display:"flex",alignItems:"center",gap:4}}>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          <span style={{fontSize:18}}>{flag(m.team2)}</span><span>{m.team2}</span>
                          {!porra.hideTeams&&(()=>{const names=participants.filter(p=>p.teams?.includes(m.team2)).map(p=>p.name);return names.length>0?<button onClick={e=>{e.stopPropagation();setPickerPopup({team:m.team2,names,x:e.clientX,y:e.clientY});}} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,padding:"0 2px",opacity:0.7}}>👥</button>:null;})()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{textAlign:"center",fontSize:10,fontFamily:"sans-serif",color:"#555",marginTop:4}}>
                    Grupo {m.group} · {m.date} · <span style={{color:"#888"}}>{m.time}h</span>
                  </div>
                  {r?.playerGoals?.length>0&&<div style={{textAlign:"center",fontSize:11,fontFamily:"sans-serif",color:"#a0c0ff",marginTop:3}}>
                    ⚽ {Object.entries((r.playerGoals||[]).reduce((a,g)=>{a[g.player]=(a[g.player]||0)+1;return a},{})).map(([p,n])=>`${p}(${n})`).join(", ")}
                  </div>}
                </div>
              );
            })}
          </div>
        )}

        {/* ── CLASIFICACIÓN GRUPOS ── */}
        {view==="grupos"&&(
          <div style={{padding:"6px 12px"}}>
            <div style={{display:"flex",gap:4,marginBottom:12,overflowX:"auto",paddingBottom:2}}>
              {Object.keys(GROUPS).map(g=>(
                <button key={g} onClick={()=>setStandingsGroup(g)} style={S.btn(standingsGroup===g)}>Grupo {g}</button>
              ))}
            </div>
            {/* Tabla */}
            <div style={S.card}>
              <div style={{fontFamily:"sans-serif",fontSize:12,color:"#d4af37",fontWeight:"bold",marginBottom:8}}>Grupo {standingsGroup}</div>
              {/* Cabecera */}
              <div style={{display:"grid",gridTemplateColumns:"14px 20px 1fr 26px 26px 26px 26px 26px 30px",gap:2,fontFamily:"sans-serif",fontSize:10,color:"#666",padding:"0 2px",marginBottom:4}}>
                <span></span><span></span><span>Equipo</span>
                <span style={{textAlign:"center"}}>PJ</span><span style={{textAlign:"center"}}>PG</span><span style={{textAlign:"center"}}>PE</span><span style={{textAlign:"center"}}>PP</span>
                <span style={{textAlign:"center"}}>GD</span><span style={{textAlign:"center",color:"#d4af37"}}>Pts</span>
              </div>
              {groupStandings(standingsGroup, state.matches).map((t,i)=>(
                <div key={t.team} style={{display:"grid",gridTemplateColumns:"14px 20px 1fr 26px 26px 26px 26px 26px 30px",gap:2,padding:"6px 2px",borderTop:"1px solid rgba(255,255,255,0.06)",alignItems:"center"}}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:i<2?"#4caf50":i===2?"#d4af37":"transparent",border:i>=2&&i<4?"1px solid #555":"none",display:"inline-block",margin:"0 auto"}}/>
                  <span style={{fontSize:15,textAlign:"center"}}>{flag(t.team)}</span>
                  <span style={{fontFamily:"sans-serif",fontSize:12,color:i<2?"#fff":"#aaa",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.team}</span>
                  {[t.pj,t.pg,t.pe,t.pp,t.dif>0?`+${t.dif}`:t.dif].map((v,j)=>(
                    <span key={j} style={{textAlign:"center",fontFamily:"sans-serif",fontSize:12,color:j===4?(t.dif>0?"#4caf50":t.dif<0?"#ff6b6b":"#888"):"#bbb"}}>{v}</span>
                  ))}
                  <span style={{textAlign:"center",fontFamily:"sans-serif",fontSize:14,fontWeight:"bold",color:"#d4af37"}}>{t.pts}</span>
                </div>
              ))}
            </div>
            {/* Partidos del grupo */}
            <div style={{fontFamily:"sans-serif",fontSize:11,color:"#888",marginBottom:8,marginTop:4}}>Partidos del grupo {standingsGroup}</div>
            {[...GROUP_MATCHES.filter(m=>m.group===standingsGroup)].sort((a,b)=>a.dateNum-b.dateNum).map(m=>{
              const r=getResult(m.id);
              return(
                <div key={m.id} style={{...S.card,padding:"10px 13px",border:r?"1px solid rgba(76,175,80,0.15)":"1px solid rgba(255,255,255,0.06)"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{flex:1,textAlign:"right",fontFamily:"sans-serif",fontSize:13,color:"#ddd",display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4}}>
                      <span>{m.team1}</span><span style={{fontSize:17}}>{flag(m.team1)}</span>
                    </div>
                    <div style={{minWidth:55,textAlign:"center",fontFamily:"sans-serif",fontWeight:"bold",fontSize:r?16:12,color:r?"#fff":"#444",background:r?"rgba(255,255,255,0.08)":"transparent",padding:"3px 8px",borderRadius:6,margin:"0 6px"}}>
                      {r?`${r.score1}–${r.score2}`:"vs"}
                    </div>
                    <div style={{flex:1,fontFamily:"sans-serif",fontSize:13,color:"#ddd",display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontSize:17}}>{flag(m.team2)}</span><span>{m.team2}</span>
                    </div>
                  </div>
                  <div style={{textAlign:"center",fontSize:10,fontFamily:"sans-serif",color:"#666",marginTop:3}}>
                    {m.date} · <span style={{color:"#888"}}>{m.time}h</span>
                  </div>
                </div>
              );
            })}

            {/* Ranking mejores terceros */}
            {(()=>{
              const thirds = bestThirds(state.matches);
              if(thirds.length===0) return null;
              return(
                <div style={{marginTop:8}}>
                  <div style={{...S.card,border:"1px solid rgba(212,175,55,0.2)"}}>
                    <div style={{fontFamily:"sans-serif",fontSize:12,color:"#d4af37",fontWeight:"bold",marginBottom:4}}>🏅 Ranking mejores terceros</div>
                    <div style={{fontFamily:"sans-serif",fontSize:10,color:"#666",marginBottom:8}}>Los 8 mejores terceros clasifican a dieciseisavos</div>
                    <div style={{display:"grid",gridTemplateColumns:"14px 20px 1fr 26px 26px 26px 30px",gap:2,fontFamily:"sans-serif",fontSize:10,color:"#555",padding:"0 2px",marginBottom:4}}>
                      <span/><span/><span>Equipo</span><span style={{textAlign:"center"}}>PJ</span><span style={{textAlign:"center"}}>DG</span><span style={{textAlign:"center"}}>GF</span><span style={{textAlign:"center",color:"#d4af37"}}>Pts</span>
                    </div>
                    {thirds.map((t,i)=>(
                      <div key={t.team} style={{display:"grid",gridTemplateColumns:"14px 20px 1fr 26px 26px 26px 30px",gap:2,padding:"6px 2px",borderTop:"1px solid rgba(255,255,255,0.05)",alignItems:"center"}}>
                        <span style={{fontFamily:"sans-serif",fontSize:11,color:i<8?"#4caf50":"#555"}}>{i+1}</span>
                        <span style={{fontSize:15,textAlign:"center"}}>{flag(t.team)}</span>
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          <span style={{fontFamily:"sans-serif",fontSize:12,color:i<8?"#fff":"#888",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.team}</span>
                          {i<8&&<span style={{fontSize:9,background:"rgba(76,175,80,0.2)",color:"#4caf50",padding:"1px 5px",borderRadius:8,fontFamily:"sans-serif",flexShrink:0}}>✓</span>}
                        </div>
                        <span style={{textAlign:"center",fontFamily:"sans-serif",fontSize:12,color:"#bbb"}}>{t.pj}</span>
                        <span style={{textAlign:"center",fontFamily:"sans-serif",fontSize:12,color:t.dif>0?"#4caf50":t.dif<0?"#ff6b6b":"#888"}}>{t.dif>0?`+${t.dif}`:t.dif}</span>
                        <span style={{textAlign:"center",fontFamily:"sans-serif",fontSize:12,color:"#bbb"}}>{t.gf}</span>
                        <span style={{textAlign:"center",fontFamily:"sans-serif",fontSize:14,fontWeight:"bold",color:"#d4af37"}}>{t.pts}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── BRACKET ── */}
        {view==="eliminatorias"&&(
          <div style={{padding:"6px 12px"}}>
            <div style={{display:"flex",gap:5,marginBottom:10,overflowX:"auto",paddingBottom:2}}>
              {["Dieciseisavos","Octavos","Cuartos","Semifinal","Final"].map(ph=>(
                <button key={ph} onClick={()=>setBracketPhase(ph)} style={S.btn(bracketPhase===ph)}>{ph}</button>
              ))}
            </div>
            <div style={{...S.card,padding:"9px 13px",marginBottom:10,border:"1px solid rgba(212,175,55,0.12)"}}>
              <div style={{fontFamily:"sans-serif",fontSize:11,color:"#777"}}>
                {{"Dieciseisavos":"32 equipos · 28 Jun–3 Jul","Octavos":"16 equipos · 4–7 Jul","Cuartos":"8 equipos · 9–11 Jul","Semifinal":"4 equipos · 14–15 Jul","Final":"🏆 19 Jul · MetLife Stadium, Nueva York"}[bracketPhase]}
              </div>
            </div>
            {sortBracket(BRACKET_BY_PHASE[bracketPhase]||[]).map(m=>renderBracket(m))}
          </div>
        )}

        {/* ── ADMIN ── */}
        {view==="admin"&&(
          <div style={{padding:"6px 12px"}}>
            {!adminUnlocked?(
              <div style={S.card}>
                <h2 style={{margin:"0 0 10px",fontSize:18}}>Panel Admin 🔧</h2>
                <input type="password" value={adminPass} onChange={e=>setAdminPass(e.target.value)} placeholder="Contraseña..." style={S.input}/>
                <button onClick={()=>{if(adminPass===(state.adminPassword||"AD1818")){setAdminUnlocked(true);toast_("Acceso ✓")}else toast_("Contraseña incorrecta","err")}} style={{width:"100%",marginTop:10,padding:"12px",borderRadius:10,border:"none",background:T.primaryGrad,color:T.btnActiveTxt,fontSize:14,fontWeight:"bold",fontFamily:"sans-serif",cursor:"pointer"}}>Acceder</button>
              </div>
            ):(
              <div>
                {/* Selector de porra en admin — siempre visible para el admin */}
                <div style={{...S.card,marginBottom:10,background:T.accent||"rgba(255,255,255,0.04)",border:`1px solid ${T.accentBorder}`}}>
                  <div style={{fontFamily:"sans-serif",fontSize:11,color:"#888",marginBottom:6}}>Gestionando:</div>
                  <div style={{display:"flex",gap:6}}>
                    {Object.values(THEMES).map(t=>(
                      <button key={t.id} onClick={()=>setActivePorra(t.id)} style={{
                        flex:1,padding:"8px",borderRadius:10,border:`1px solid ${activePorra===t.id?t.accentBorder:"rgba(255,255,255,0.1)"}`,cursor:"pointer",
                        background:activePorra===t.id?t.primaryGrad:"rgba(255,255,255,0.04)",
                        color:activePorra===t.id?t.btnActiveTxt:"#888",fontFamily:"sans-serif",fontSize:12,fontWeight:"bold"
                      }}>
                        {t.emoji} {t.name}
                      </button>
                    ))}
                  </div>
                  <div style={{fontFamily:"sans-serif",fontSize:10,color:"#555",marginTop:6,textAlign:"center"}}>
                    ⚽ Resultados y goles son compartidos entre las dos porras
                  </div>
                </div>

                <div style={{display:"flex",gap:5,marginBottom:10,overflowX:"auto"}}>
                  {["grupos","bracket","jugadores","participantes","avisos","historial","ajustes"].map(t=>(
                    <button key={t} onClick={()=>setAdminTab(t)} style={S.btn(adminTab===t)}>
                      {t==="grupos"?"Fase grupos":t==="bracket"?"Eliminatorias":t==="jugadores"?"Jugadores":t==="participantes"?"Participantes":t==="avisos"?"📢 Avisos":t==="historial"?"📋 Historial":"⚙️ Ajustes"}
                    </button>
                  ))}
                </div>

                {/* Admin - Fase grupos */}
                {adminTab==="grupos"&&(
                  <div>
                    <div style={{display:"flex",gap:4,marginBottom:8,overflowX:"auto",paddingBottom:2,alignItems:"center"}}>
                      <div style={{display:"flex",gap:4,flex:1,overflowX:"auto"}}>
                        {["Todos",...Object.keys(GROUPS)].map(g=>(
                          <button key={g} onClick={()=>setGroupFilter(g)} style={{padding:"4px 10px",borderRadius:14,border:"none",cursor:"pointer",fontSize:11,fontFamily:"sans-serif",fontWeight:600,whiteSpace:"nowrap",background:groupFilter===g?"rgba(212,175,55,0.2)":"rgba(255,255,255,0.05)",color:groupFilter===g?"#d4af37":"#777"}}>
                            {g==="Todos"?"Todos":`G.${g}`}
                          </button>
                        ))}
                      </div>
                      {/* Resetear todos los resultados de grupos */}
                      {state.matches.filter(m=>m.phase==="Grupos").length>0&&(
                        <button onClick={()=>setConfirmDialog({msg:"¿Eliminar TODOS los resultados de la fase de grupos?",onOk:()=>{
                          setState(s=>({...s,matches:s.matches.filter(m=>m.phase!=="Grupos")}));
                          addLog("🔄 Reset general fase de grupos");
                          toast_("Resultados de grupos eliminados");
                        }})} style={{padding:"4px 10px",borderRadius:12,border:"1px solid rgba(255,50,50,0.3)",background:"rgba(255,50,50,0.08)",color:"#ff6b6b",fontSize:11,fontFamily:"sans-serif",cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
                          🔄 Reset grupos
                        </button>
                      )}
                    </div>
                    {(groupFilter==="Todos"?GROUP_MATCHES_CHRONO:GROUP_MATCHES.filter(m=>m.group===groupFilter)).map(m=>{
                      const r=getResult(m.id); const isE=editMatch===m.id;
                      return(
                        <div key={m.id} style={S.card}>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:isE?8:0}}>
                            <div style={{fontFamily:"sans-serif",fontSize:12,flex:1}}>
                              <span style={{color:"#ddd"}}>{m.team1}</span><span style={{color:"#444",margin:"0 5px"}}>vs</span><span style={{color:"#ddd"}}>{m.team2}</span>
                              <span style={{color:"#555",fontSize:10,marginLeft:5}}>· {m.date}</span>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              {r&&!isE&&<span style={{fontFamily:"sans-serif",fontWeight:"bold",color:"#4caf50",fontSize:14}}>{r.score1}–{r.score2}</span>}
                              {r&&!isE&&<button onClick={()=>setConfirmDialog({msg:`¿Eliminar resultado de ${m.team1} vs ${m.team2}?`,onOk:()=>resetMatch(m.id)})} style={{padding:"3px 7px",borderRadius:8,border:"1px solid rgba(255,50,50,0.3)",background:"rgba(255,50,50,0.08)",color:"#ff6b6b",fontSize:11,cursor:"pointer"}}>🔄</button>}
                              <button onClick={()=>setEditMatch(isE?null:m.id)} style={{...S.btn(isE),padding:"4px 10px",fontSize:11}}>{isE?"×":r?"Editar":"+ Añadir"}</button>
                            </div>
                          </div>
                          {isE&&(
                            <div>
                              <div style={{display:"flex",gap:6,marginBottom:6}}>
                                <input type="number" min="0" placeholder="0" value={scores[m.id+"_1"]??r?.score1??""} onChange={e=>setScores(s=>({...s,[m.id+"_1"]:e.target.value}))} style={{...S.input,textAlign:"center",flex:1,padding:"8px"}}/>
                                <span style={{alignSelf:"center",color:"#555",fontWeight:"bold"}}>–</span>
                                <input type="number" min="0" placeholder="0" value={scores[m.id+"_2"]??r?.score2??""} onChange={e=>setScores(s=>({...s,[m.id+"_2"]:e.target.value}))} style={{...S.input,textAlign:"center",flex:1,padding:"8px"}}/>
                              </div>
                              <button onClick={()=>saveResult(m.id,"Grupos",m.team1,m.team2)} style={{width:"100%",padding:"9px",borderRadius:9,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#4caf50,#087f23)",color:"#fff",fontSize:13,fontWeight:"bold",fontFamily:"sans-serif"}}>✓ Guardar</button>
                              {pgBlock(m.id)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Admin - Bracket */}
                {adminTab==="bracket"&&(
                  <div>
                    <div style={{display:"flex",gap:5,marginBottom:10,overflowX:"auto",alignItems:"center"}}>
                      <div style={{display:"flex",gap:5,flex:1,overflowX:"auto"}}>
                        {["Dieciseisavos","Octavos","Cuartos","Semifinal","Final"].map(ph=>(
                          <button key={ph} onClick={()=>setBracketPhase(ph)} style={S.btn(bracketPhase===ph)}>{ph}</button>
                        ))}
                      </div>
                      {state.matches.filter(m=>m.phase===bracketPhase).length>0&&(
                        <button onClick={()=>setConfirmDialog({msg:`¿Eliminar todos los resultados de ${bracketPhase}?`,onOk:()=>{
                          setState(s=>({...s,matches:s.matches.filter(m=>m.phase!==bracketPhase)}));
                          addLog(`🔄 Reset ${bracketPhase}`);
                          toast_(`Resultados de ${bracketPhase} eliminados`);
                        }})} style={{padding:"4px 10px",borderRadius:12,border:"1px solid rgba(255,50,50,0.3)",background:"rgba(255,50,50,0.08)",color:"#ff6b6b",fontSize:11,fontFamily:"sans-serif",cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
                          🔄 Reset fase
                        </button>
                      )}
                    </div>
                    {sortBracket(BRACKET_BY_PHASE[bracketPhase]||[]).map(m=>renderBracket(m))}
                  </div>
                )}

                {/* Admin - Jugadores */}
                {adminTab==="jugadores"&&(
                  <div>
                    <div style={S.card}>
                      <div style={{fontFamily:"sans-serif",fontSize:13,color:"#d4af37",fontWeight:"bold",marginBottom:10}}>Lista de jugadores elegibles</div>
                      <div style={{display:"flex",gap:6,marginBottom:10}}>
                        <input value={newPlayerName} onChange={e=>setNewPlayerName(e.target.value)}
                          placeholder="Nombre del jugador..."
                          onKeyDown={e=>{
                            if(e.key==="Enter"&&newPlayerName.trim()){
                              const n=newPlayerName.trim();
                              if((playerList||[]).some(p=>norm(p)===norm(n))) return toast_("Ya existe","err");
                              setPorra(p=>({...p,playerList:[...(p.playerList||[]),n]}));
                              setNewPlayerName(""); toast_(`${n} añadido ✓`);
                            }
                          }}
                          style={{...S.input,flex:1,padding:"9px",fontSize:13}}/>
                        <button onClick={()=>{
                          const n=newPlayerName.trim();
                          if(!n) return toast_("Escribe un nombre","err");
                          if((playerList||[]).some(p=>norm(p)===norm(n))) return toast_("Ya existe","err");
                          setPorra(p=>({...p,playerList:[...(p.playerList||[]),n]}));
                          setNewPlayerName(""); toast_(`${n} añadido ✓`);
                        }} style={{padding:"9px 16px",borderRadius:9,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#d4af37,#ff6b00)",color:"#000",fontWeight:"bold",fontSize:15,flexShrink:0}}>+</button>
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                        {(playerList||[]).map(pl=>(
                          <div key={pl} style={{display:"flex",alignItems:"center",gap:4,background:"rgba(123,47,255,0.12)",padding:"4px 10px",borderRadius:15,border:"1px solid rgba(123,47,255,0.2)"}}>
                            <span style={{fontFamily:"sans-serif",fontSize:12,color:"#b0a0ff"}}>{pl}</span>
                            <button onClick={()=>{
                              setConfirmDialog({msg:`¿Eliminar a ${pl} de la lista de jugadores?`,onOk:()=>{
                                setPorra(p=>({...p,playerList:(p.playerList||[]).filter(x=>x!==pl)}));
                                toast_(`${pl} eliminado`);
                              }});
                            }} style={{background:"none",border:"none",color:"#ff6b6b",cursor:"pointer",fontSize:12,padding:"0 2px",lineHeight:1}}>×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{...S.card,background:"rgba(212,175,55,0.05)",border:"1px solid rgba(212,175,55,0.15)"}}>
                      <div style={{fontFamily:"sans-serif",fontSize:11,color:"#888"}}>
                        Los jugadores de esta lista son los que aparecen en el registro. Añade aquí los jugadores del Mundial antes de que los participantes se registren.
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin - Participantes */}
                {adminTab==="participantes"&&(
                  <div>
                    {participants.length===0?(
                      <div style={{...S.card,textAlign:"center",padding:28}}><div style={{fontFamily:"sans-serif",color:"#555"}}>Sin participantes</div></div>
                    ):participants.map(p=>(
                      <div key={p.id} style={S.card}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                          <span style={{fontWeight:"bold",fontSize:14}}>{p.name}</span>
                          <div style={{display:"flex",gap:6}}>
                            <button onClick={()=>{setEditParticipant({...p});setEditSearch("");}} style={{padding:"3px 9px",borderRadius:7,border:"none",cursor:"pointer",background:"rgba(212,175,55,0.12)",color:"#d4af37",fontSize:11,fontFamily:"sans-serif"}}>✏️ Editar</button>
                            <button onClick={()=>{setConfirmDialog({msg:`¿Eliminar a ${p.name} de la porra?`,onOk:()=>{setPorra(prev=>({...prev,participants:prev.participants.filter(x=>x.id!==p.id)}));toast_(`${p.name} eliminado`);addLog(`🗑 Participante eliminado: ${p.name}`);}});}} style={{padding:"3px 9px",borderRadius:7,border:"none",cursor:"pointer",background:"rgba(255,50,50,0.12)",color:"#ff6b6b",fontSize:11,fontFamily:"sans-serif"}}>Eliminar</button>
                          </div>
                        </div>
                        <div style={{fontSize:11,fontFamily:"sans-serif",color:"#777"}}><span style={{color:"#d4af37"}}>Equipos: </span>{p.teams.join(", ")}</div>
                        <div style={{fontSize:11,fontFamily:"sans-serif",color:"#777",marginTop:3}}><span style={{color:"#7b8fff"}}>Jugadores: </span>{p.players.join(", ")}</div>
                        {p.registeredAt&&<div style={{fontSize:10,fontFamily:"sans-serif",color:"#555",marginTop:3}}>📅 Registrado: {p.registeredAt}</div>}
                      </div>
                    ))}
                    <button onClick={()=>{setConfirmDialog({msg:"¿Eliminar TODOS los resultados de todos los partidos? Los participantes y premios no se borran.",onOk:()=>resetAllMatches()});}} style={{width:"100%",marginTop:6,padding:"11px",borderRadius:10,border:"1px solid rgba(255,150,50,0.2)",background:"transparent",color:"#ff9a4a",fontSize:13,fontFamily:"sans-serif",cursor:"pointer"}}>🔄 Resetear todos los resultados</button>
                    <button onClick={()=>{setConfirmDialog({msg:"¿Resetear TODOS los datos? Esta acción no se puede deshacer.",onOk:()=>{setPorra(initialPorra());setAdminUnlocked(false);toast_("Datos borrados");}});}} style={{width:"100%",marginTop:6,padding:"11px",borderRadius:10,border:"1px solid rgba(255,50,50,0.2)",background:"transparent",color:"#ff6b6b",fontSize:13,fontFamily:"sans-serif",cursor:"pointer"}}>🗑 Resetear todo</button>
                  </div>
                )}

                {adminTab==="avisos"&&(
                  <div>
                    {/* Formulario nuevo aviso */}
                    <div style={S.card}>
                      <div style={{fontFamily:"sans-serif",fontSize:13,color:"#d4af37",fontWeight:"bold",marginBottom:10}}>📢 Nuevo aviso</div>
                      <input value={nuevoAviso.titulo} onChange={e=>setNuevoAviso(a=>({...a,titulo:e.target.value}))}
                        placeholder="Título del aviso..."
                        style={{...S.input,marginBottom:8}}/>
                      <textarea value={nuevoAviso.texto} onChange={e=>setNuevoAviso(a=>({...a,texto:e.target.value}))}
                        placeholder="Texto adicional (opcional)..."
                        style={{...S.input,minHeight:70,resize:"vertical",marginBottom:8}}/>
                      {/* Tipo de aviso */}
                      <div style={{display:"flex",gap:6,marginBottom:10}}>
                        {[
                          {id:"info",label:"📢 Info",color:"rgba(100,150,255,0.2)"},
                          {id:"warning",label:"⚠️ Aviso",color:"rgba(255,180,0,0.2)"},
                          {id:"success",label:"✅ Noticia",color:"rgba(76,175,80,0.2)"},
                        ].map(t=>(
                          <button key={t.id} onClick={()=>setNuevoAviso(a=>({...a,tipo:t.id}))}
                            style={{flex:1,padding:"8px",borderRadius:9,border:`1px solid ${nuevoAviso.tipo===t.id?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.08)"}`,cursor:"pointer",background:nuevoAviso.tipo===t.id?t.color:"transparent",color:"#ccc",fontFamily:"sans-serif",fontSize:12}}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                      <button onClick={()=>{
                        if(!nuevoAviso.titulo.trim()) return toast_("Escribe un título","err");
                        const aviso={id:Date.now(),titulo:nuevoAviso.titulo.trim(),texto:nuevoAviso.texto.trim(),tipo:nuevoAviso.tipo,fecha:new Date().toLocaleDateString("es-ES")};
                        setPorra(p=>({...p,avisos:[aviso,...(p.avisos||[])]}));
                        setNuevoAviso({titulo:"",texto:"",tipo:"info"});
                        toast_("Aviso publicado ✓");
                      }} style={{width:"100%",padding:"11px",borderRadius:10,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#d4af37,#ff6b00)",color:"#000",fontSize:14,fontWeight:"bold",fontFamily:"sans-serif"}}>
                        📢 Publicar aviso
                      </button>
                    </div>

                    {/* Lista de avisos publicados */}
                    {(porra.avisos||[]).length===0?(
                      <div style={{...S.card,textAlign:"center",padding:24}}>
                        <div style={{fontFamily:"sans-serif",color:"#555",fontSize:13}}>No hay avisos publicados</div>
                      </div>
                    ):(porra.avisos||[]).map((a,i)=>{
                      const colors = {
                        info:  {border:"rgba(100,150,255,0.25)", icon:"📢"},
                        warning:{border:"rgba(255,180,0,0.25)",  icon:"⚠️"},
                        success:{border:"rgba(76,175,80,0.25)",  icon:"✅"},
                      };
                      const col = colors[a.tipo]||colors.info;
                      return(
                        <div key={a.id} style={{...S.card,border:col.border,padding:"12px 14px",opacity:a.hidden?0.5:1}}>
                          <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                            <span style={{fontSize:16,flexShrink:0}}>{col.icon}</span>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:13,color:"#ddd"}}>{a.titulo}</div>
                              {a.texto&&<div style={{fontFamily:"sans-serif",fontSize:12,color:"#888",marginTop:3}}>{a.texto}</div>}
                              <div style={{fontFamily:"sans-serif",fontSize:10,color:"#555",marginTop:4}}>{a.fecha}</div>
                            </div>
                            <div style={{display:"flex",gap:6,flexShrink:0}}>
                              <button onClick={()=>{
                                setPorra(p=>({...p,avisos:(p.avisos||[]).map(x=>x.id===a.id?{...x,hidden:!x.hidden}:x)}));
                                toast_(a.hidden?"Aviso visible":"Aviso oculto");
                              }} style={{background:"none",border:`1px solid ${a.hidden?"rgba(76,175,80,0.4)":"rgba(255,180,0,0.4)"}`,borderRadius:6,color:a.hidden?"#4caf50":"#ffd060",cursor:"pointer",fontSize:11,padding:"2px 7px",fontFamily:"sans-serif"}}>
                                {a.hidden?"👁 Mostrar":"🙈 Ocultar"}
                              </button>
                              <button onClick={()=>setConfirmDialog({msg:`¿Eliminar aviso "${a.titulo}"?`,onOk:()=>{
                                setPorra(p=>({...p,avisos:(p.avisos||[]).filter(x=>x.id!==a.id)}));
                                toast_("Aviso eliminado");
                              }})} style={{background:"none",border:"none",color:"#ff6b6b",cursor:"pointer",fontSize:16,padding:"0 4px"}}>×</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {adminTab==="historial"&&(
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div style={{fontFamily:"sans-serif",fontSize:13,color:"#d4af37",fontWeight:"bold"}}>📋 Historial de cambios</div>
                      {(porra.historial||[]).length>0&&(
                        <button onClick={()=>setConfirmDialog({msg:"¿Borrar todo el historial?",onOk:()=>setPorra(p=>({...p,historial:[]}))})}
                          style={{padding:"4px 10px",borderRadius:8,border:"none",cursor:"pointer",background:"rgba(255,50,50,0.1)",color:"#ff6b6b",fontSize:11,fontFamily:"sans-serif"}}>
                          Borrar todo
                        </button>
                      )}
                    </div>
                    {(porra.historial||[]).length===0?(
                      <div style={{...S.card,textAlign:"center",padding:28}}>
                        <div style={{fontSize:28,marginBottom:8}}>📋</div>
                        <div style={{fontFamily:"sans-serif",color:"#555",fontSize:13}}>No hay cambios registrados aún</div>
                      </div>
                    ):(porra.historial||[]).map((entry,i)=>(
                      <div key={entry.id} style={{...S.card,padding:"9px 13px",border:"1px solid rgba(255,255,255,0.06)"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                          <div style={{fontFamily:"sans-serif",fontSize:13,color:"#ddd",flex:1}}>{entry.msg}</div>
                          <div style={{fontFamily:"sans-serif",fontSize:10,color:"#555",flexShrink:0,textAlign:"right"}}>{entry.ts}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {adminTab==="ajustes"&&(
                  <div>
                    {/* Cambiar contraseña admin */}
                    <div style={{...S.card,border:`1px solid ${T.accentBorder}`,marginBottom:12}}>
                      <div style={{fontFamily:"sans-serif",fontSize:13,color:T.primary,fontWeight:"bold",marginBottom:10}}>🔑 Contraseña de administrador</div>
                      <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)}
                        placeholder="Nueva contraseña..."
                        style={{...S.input,marginBottom:8}}/>
                      <input type="password" value={newPass2} onChange={e=>setNewPass2(e.target.value)}
                        placeholder="Repetir contraseña..."
                        style={{...S.input,marginBottom:8}}/>
                      <button onClick={()=>{
                        if(!newPass.trim()) return toast_("Escribe una contraseña","err");
                        if(newPass!==newPass2) return toast_("Las contraseñas no coinciden","err");
                        if(newPass.length<4) return toast_("Mínimo 4 caracteres","err");
                        setState(s=>({...s,adminPassword:newPass}));
                        setNewPass(""); setNewPass2("");
                        toast_("Contraseña actualizada ✓");
                        addLog("🔑 Contraseña de admin actualizada");
                      }} style={{width:"100%",padding:"10px",borderRadius:9,border:"none",cursor:"pointer",background:T.primaryGrad,color:T.btnActiveTxt,fontWeight:"bold",fontFamily:"sans-serif",fontSize:14}}>
                        ✓ Cambiar contraseña
                      </button>
                    </div>

                    {/* Configuración de premios */}
                    <div style={{fontFamily:"sans-serif",fontSize:13,color:"#d4af37",fontWeight:"bold",marginBottom:8}}>💰 Configuración de premios</div>
                    {(()=>{
                      const cfg = porra.premiosConfig || DEFAULT_PREMIOS_CONFIG;
                      const PHASES = activePorra==="zumaia" ? ["J1","J2","J3","Dieciseisavos","Octavos","Cuartos","Semifinal"] : ["Grupos","Dieciseisavos","Octavos","Cuartos","Semifinal"];
                      const generalPot = (cfg.boteTotal||300) - PHASES.length*(cfg.phasePrize||5);
                      return(
                        <div style={S.card}>
                          {/* Bote total */}
                          <div style={{marginBottom:10}}>
                            <div style={{fontFamily:"sans-serif",fontSize:12,color:"#888",marginBottom:5}}>Bote total (€)</div>
                            <div style={{display:"flex",gap:8,alignItems:"center"}}>
                              <input type="text" inputMode="decimal" value={cfg.boteTotal??300}
                                onChange={e=>{
                                  const v=e.target.value;
                                  if(v===""||/^\d*\.?\d*$/.test(v))
                                    setPorra(pr=>({...pr,premiosConfig:{...pr.premiosConfig,boteTotal:v===""?0:parseFloat(v)}}));
                                }}
                                style={{...S.input,flex:1,padding:"8px",textAlign:"center"}}/>
                              <span style={{fontFamily:"sans-serif",fontSize:12,color:"#555",flexShrink:0}}>Bote general: <b style={{color:"#4caf50"}}>{generalPot}€</b></span>
                            </div>
                          </div>
                          {/* Premio por fase */}
                          <div style={{marginBottom:10}}>
                            <div style={{fontFamily:"sans-serif",fontSize:12,color:"#888",marginBottom:5}}>Premio por fase (€)</div>
                            <input type="text" inputMode="decimal" value={cfg.phasePrize??5}
                              onChange={e=>{
                                const v=e.target.value;
                                if(v===""||/^\d*\.?\d*$/.test(v))
                                  setPorra(pr=>({...pr,premiosConfig:{...pr.premiosConfig,phasePrize:v===""?0:parseFloat(v)}}));
                              }}
                              style={{...S.input,padding:"8px",textAlign:"center"}}/>
                          </div>
                          {/* Porcentajes clasificación general */}
                          <div>
                            <div style={{fontFamily:"sans-serif",fontSize:12,color:"#888",marginBottom:5}}>% clasificación general (1º, 2º, 3º, 4º)</div>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6}}>
                              {(cfg.generalPct||[45,32,14,9]).map((pct,i)=>(
                                <div key={i}>
                                  <div style={{fontFamily:"sans-serif",fontSize:10,color:"#666",textAlign:"center",marginBottom:3}}>{["🥇","🥈","🥉","4º"][i]}</div>
                                  <input type="text" inputMode="decimal" value={pct}
                                    onChange={e=>{
                                      const v=e.target.value;
                                      if(v===""||/^\d*\.?\d*$/.test(v)){
                                        const newPcts=[...(cfg.generalPct||[45,32,14,9])];
                                        newPcts[i]=v===""?0:parseFloat(v);
                                        setPorra(pr=>({...pr,premiosConfig:{...pr.premiosConfig,generalPct:newPcts}}));
                                      }
                                    }}
                                    style={{...S.input,padding:"8px",textAlign:"center",fontSize:13}}/>
                                  <div style={{fontFamily:"sans-serif",fontSize:10,color:"#4caf50",textAlign:"center",marginTop:2}}>
                                    {Math.round(generalPot*(pct/100)*100)/100}€
                                  </div>
                                </div>
                              ))}
                            </div>
                            {(()=>{
                              const total=(cfg.generalPct||[45,32,14,9]).reduce((s,p)=>s+p,0);
                              return total!==100?<div style={{fontFamily:"sans-serif",fontSize:11,color:"#ff9a4a",marginTop:5,textAlign:"center"}}>⚠️ Los porcentajes suman {total}% (deben ser 100%)</div>:null;
                            })()}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Control de registro */}
                    <div style={{...S.card,border:`1px solid ${porra.registrationClosed?"rgba(255,100,100,0.3)":"rgba(76,175,80,0.3)"}`,marginBottom:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <div style={{fontFamily:"sans-serif",fontSize:13,color:porra.registrationClosed?"#ff9a9a":"#a8d8a8",fontWeight:"bold",marginBottom:3}}>
                            {porra.registrationClosed?"🔒 Registro cerrado":"🟢 Registro abierto"}
                          </div>
                          <div style={{fontFamily:"sans-serif",fontSize:11,color:"#666"}}>
                            {porra.registrationClosed
                              ?"Solo tú (admin) puedes añadir participantes"
                              :"Cualquiera puede registrarse"}
                          </div>
                        </div>
                        <button onClick={()=>setPorra(p=>({...p,registrationClosed:!p.registrationClosed}))} style={{
                          padding:"9px 16px",borderRadius:20,border:"none",cursor:"pointer",flexShrink:0,
                          background:porra.registrationClosed?"linear-gradient(135deg,#4caf50,#087f23)":"linear-gradient(135deg,#c0392b,#e74c3c)",
                          color:"#fff",fontFamily:"sans-serif",fontSize:13,fontWeight:"bold"
                        }}>
                          {porra.registrationClosed?"🔓 Abrir":"🔒 Cerrar"}
                        </button>
                      </div>
                    </div>
                    <div style={{...S.card,border:"1px solid rgba(123,47,255,0.25)",marginBottom:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <div style={{fontFamily:"sans-serif",fontSize:13,color:"#b0a0ff",fontWeight:"bold",marginBottom:3}}>
                            🔒 Modo secreto
                          </div>
                          <div style={{fontFamily:"sans-serif",fontSize:11,color:"#666"}}>
                            {porra.hideTeams
                              ? "Activado — los usuarios no ven los equipos ni jugadores de los demás"
                              : "Desactivado — todos ven los equipos de los demás"}
                          </div>
                        </div>
                        <button onClick={()=>setPorra(p=>({...p,hideTeams:!p.hideTeams}))} style={{
                          padding:"9px 16px",borderRadius:20,border:"none",cursor:"pointer",
                          background:porra.hideTeams?"linear-gradient(135deg,#7b2fff,#00c6ff)":"rgba(255,255,255,0.08)",
                          color:porra.hideTeams?"#fff":"#888",
                          fontFamily:"sans-serif",fontSize:13,fontWeight:"bold",flexShrink:0
                        }}>
                          {porra.hideTeams?"🔒 Activado":"🔓 Activar"}
                        </button>
                      </div>
                    </div>

                    <div style={{...S.card,border:"1px solid rgba(212,175,55,0.15)",marginBottom:12}}>
                      <div style={{fontFamily:"sans-serif",fontSize:13,color:"#d4af37",fontWeight:"bold",marginBottom:10}}>🏠 Secciones pantalla de inicio</div>
                      {[
                        {key:"comoFunciona", label:"¿Cómo funciona?"},
                        {key:"puntuacion",   label:"Puntuación"},
                        {key:"creditos",     label:"Sistema de Créditos"},
                      ].map(({key,label})=>{
                        const hidden = porra.homeHidden?.[key]||false;
                        return(
                          <div key={key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                            <span style={{fontFamily:"sans-serif",fontSize:13,color:hidden?"#555":"#ccc"}}>{label}</span>
                            <button onClick={()=>setPorra(p=>({...p,homeHidden:{...(p.homeHidden||{}), [key]:!hidden}}))}
                              style={{padding:"5px 12px",borderRadius:14,border:"none",cursor:"pointer",
                                background:hidden?"rgba(255,50,50,0.12)":"rgba(76,175,80,0.12)",
                                color:hidden?"#ff6b6b":"#4caf50",
                                fontFamily:"sans-serif",fontSize:12,fontWeight:"bold"}}>
                              {hidden?"🙈 Oculto":"👁 Visible"}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{...S.card,border:"1px solid rgba(212,175,55,0.15)",marginBottom:12}}>
                      <div style={{fontFamily:"sans-serif",fontSize:12,color:"#888"}}>
                        Ajusta puntos manualmente, añade un motivo para tenerlo registrado, y elimina goles o usuarios si es necesario.
                      </div>
                    </div>

                    {/* Ajuste de puntos */}
                    <div style={{fontFamily:"sans-serif",fontSize:13,color:"#d4af37",fontWeight:"bold",marginBottom:8}}>Ajuste manual de puntos</div>
                    {participants.length===0&&<div style={{...S.card,textAlign:"center",padding:20}}><div style={{fontFamily:"sans-serif",color:"#555",fontSize:13}}>Sin participantes</div></div>}
                    {participants.map(p=>{
                      const adjs=Array.isArray(p.manualAdjustments)?p.manualAdjustments:(p.manualPts&&p.manualPts!==0)?[{pts:p.manualPts,reason:p.manualReason||"",date:""}]:[];
                      const totalAdj=adjs.reduce((s,a)=>s+(a.pts||0),0);
                      const isOpen=manualOpen===p.id;
                      return(
                        <div key={p.id} style={S.card}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontWeight:"bold",fontSize:14}}>{p.name}</div>
                              {adjs.length>0&&<div style={{fontSize:11,fontFamily:"sans-serif",color:totalAdj>0?"#4caf50":totalAdj<0?"#ff6b6b":"#888",marginTop:2}}>{adjs.length} ajuste{adjs.length>1?"s":""}: {totalAdj>0?"+":""}{totalAdj} pts</div>}
                            </div>
                            <div style={{display:"flex",gap:6}}>
                              <button onClick={()=>setConfirmDialog({msg:"Eliminar a "+p.name+"?",onOk:()=>{setPorra(prev=>({...prev,participants:prev.participants.filter(x=>x.id!==p.id)}));toast_(p.name+" eliminado");}})} style={{padding:"4px 10px",borderRadius:8,border:"none",cursor:"pointer",background:"rgba(255,50,50,0.12)",color:"#ff6b6b",fontSize:11,fontFamily:"sans-serif"}}>🗑</button>
                              <button onClick={()=>{setManualOpen(isOpen?null:p.id);setManualPts(m=>({...m,[p.id]:"0"}));setManualReason(m=>({...m,[p.id]:""}));}} style={{...S.btn(isOpen),padding:"5px 12px",fontSize:12}}>{isOpen?"Cerrar":"+ Ajuste"}</button>
                            </div>
                          </div>
                          {adjs.length>0&&<div style={{marginTop:8}}>{adjs.map((a,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderTop:"1px solid rgba(255,255,255,0.05)"}}><span style={{fontFamily:"sans-serif",fontSize:13,fontWeight:"bold",color:a.pts>0?"#4caf50":a.pts<0?"#ff6b6b":"#888",minWidth:36}}>{a.pts>0?"+":""}{a.pts}</span><span style={{fontFamily:"sans-serif",fontSize:12,color:"#888",flex:1}}>{a.reason||"Sin motivo"}</span>{a.date&&<span style={{fontFamily:"sans-serif",fontSize:10,color:"#555"}}>{a.date}</span>}<button onClick={()=>setConfirmDialog({msg:"Borrar ajuste?",onOk:()=>{const na=adjs.filter((_,j)=>j!==i);setPorra(prev=>({...prev,participants:prev.participants.map(x=>x.id===p.id?{...x,manualAdjustments:na}:x)}));toast_("Ajuste borrado");}})} style={{background:"none",border:"none",color:"#ff6b6b",cursor:"pointer",fontSize:16,padding:"0 4px"}}>x</button></div>)}</div>}
                          {isOpen&&<div style={{marginTop:10,paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.08)"}}>
                            <div style={{fontFamily:"sans-serif",fontSize:11,color:"#888",marginBottom:8}}>Nuevo ajuste:</div>
                            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                              <button onMouseDown={e=>{e.preventDefault();const c=parseFloat(manualPts[p.id]||"0")||0;setManualPts(m=>({...m,[p.id]:String(c-1)}));}} style={{width:44,height:44,borderRadius:10,border:"1px solid rgba(255,100,100,0.4)",background:"transparent",color:"#ff9a9a",fontSize:22,cursor:"pointer",flexShrink:0}}>-</button>
                              <input type="text" inputMode="decimal" value={manualPts[p.id]||"0"} onChange={e=>{const v=e.target.value;if(v===""||v==="-"||/^-?[0-9]+[.]?[0-9]*$/.test(v))setManualPts(m=>({...m,[p.id]:v}));}} style={{...S.input,flex:1,padding:"9px",textAlign:"center",fontSize:20,fontWeight:"bold"}}/>
                              <button onMouseDown={e=>{e.preventDefault();const c=parseFloat(manualPts[p.id]||"0")||0;setManualPts(m=>({...m,[p.id]:String(c+1)}));}} style={{width:44,height:44,borderRadius:10,border:"1px solid rgba(76,175,80,0.4)",background:"transparent",color:"#a8d8a8",fontSize:22,cursor:"pointer",flexShrink:0}}>+</button>
                            </div>
                            <input value={manualReason[p.id]||""} onChange={e=>setManualReason(m=>({...m,[p.id]:e.target.value}))} placeholder="Motivo del ajuste..." style={{...S.input,marginBottom:8,fontSize:13}}/>
                            <button onClick={()=>{const val=parseFloat(manualPts[p.id]);if(isNaN(val))return toast_("Numero invalido","err");const reason=(manualReason[p.id]||"").trim();const na=[...adjs,{pts:val,reason:reason,date:new Date().toLocaleDateString("es-ES")}];setPorra(prev=>({...prev,participants:prev.participants.map(x=>x.id===p.id?{...x,manualAdjustments:na,manualPts:undefined,manualReason:undefined}:x)}));setManualOpen(null);toast_(p.name+": "+(val>0?"+":"")+val+" pts");addLog("Ajuste "+p.name+": "+(val>0?"+":"")+val+" pts"+(reason?" - "+reason:""));}} style={{width:"100%",padding:"10px",borderRadius:9,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#4caf50,#087f23)",color:"#fff",fontWeight:"bold",fontFamily:"sans-serif",fontSize:14}}>Guardar ajuste</button>
                          </div>}
                        </div>
                      );
                    })}
                                        {/* Eliminar goles */}
                    <div style={{fontFamily:"sans-serif",fontSize:13,color:"#d4af37",fontWeight:"bold",marginBottom:8,marginTop:16}}>🗑 Eliminar goles registrados</div>
                    {state.matches.filter(m=>(m.playerGoals||[]).length>0).length===0?(
                      <div style={{...S.card,textAlign:"center",padding:20}}><div style={{fontFamily:"sans-serif",color:"#555",fontSize:13}}>No hay goles registrados aún</div></div>
                    ):state.matches.filter(m=>(m.playerGoals||[]).length>0).map(m=>(
                      <div key={m.id} style={S.card}>
                        <div style={{fontFamily:"sans-serif",fontSize:12,color:"#888",marginBottom:7}}>
                          <span style={{color:"#ddd",fontWeight:"bold"}}>{m.team1||"?"} vs {m.team2||"?"}</span> · {m.phase} · {m.date||""}
                        </div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                          {Object.entries((m.playerGoals||[]).reduce((a,g)=>{a[g.player]=(a[g.player]||0)+1;return a},{})).map(([pl,n])=>(
                            <button key={pl} onClick={()=>{
                              setConfirmDialog({msg:`¿Eliminar 1 gol de ${pl}?`,onOk:()=>{
                                removePG(m.id,pl);toast_(`Gol de ${pl} eliminado`);
                              }});
                            }} style={{background:"rgba(255,50,50,0.12)",padding:"4px 10px",borderRadius:12,fontSize:12,fontFamily:"sans-serif",color:"#ff9a9a",border:"1px solid rgba(255,50,50,0.2)",cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                              {pl} ({n}⚽) <span style={{color:"#ff6b6b",fontSize:11}}>×</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL BACKUP ── */}
      {/* ── MODAL EDITAR PARTICIPANTE ── */}
      {editParticipant&&(()=>{
        const ep = editParticipant;
        const spent = ep.teams.reduce((s,t)=>s+kOf(t),0);
        const remaining = MAX_KREDITU - spent;
        const has13 = ep.teams.filter(t=>kOf(t)===13).length;
        const has11 = ep.teams.filter(t=>kOf(t)===11).length;
        const pct = Math.min(100,Math.round((spent/MAX_KREDITU)*100));

        const canAdd = (t) => {
          if(ep.teams.includes(t)) return true;
          if(ep.teams.length>=12) return false;
          if(kOf(t)>remaining) return false;
          if(kOf(t)===13 && has13>=1) return false;
          if(kOf(t)===11 && has11>=1) return false;
          return true;
        };

        const filtered = TEAMS.filter(t=>norm(t).includes(norm(editSearch)));
        const playerList = playerList;
        const filteredPlayers = playerList.filter(p=>norm(p).includes(norm(editSearch)));

        return(
          <div onClick={e=>{if(e.target===e.currentTarget)setEditParticipant(null);}}
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:2000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",paddingTop:16,overflowY:"auto"}}>
            <div style={{width:"calc(100% - 24px)",maxWidth:460,background:"linear-gradient(160deg,#0d1520,#14081e)",borderRadius:18,border:"1px solid rgba(212,175,55,0.3)",overflow:"hidden",marginBottom:20}}>
              <div style={{background:"linear-gradient(135deg,rgba(212,175,55,0.15),rgba(255,107,0,0.1))",padding:"14px 18px",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
                <div style={{fontSize:10,letterSpacing:3,color:"#d4af37",textTransform:"uppercase",marginBottom:2}}>Editar participante</div>
                <div style={{fontSize:18,fontWeight:"bold",color:"#fff"}}>{ep.name}</div>
              </div>

              <div style={{padding:"14px 16px",maxHeight:"75vh",overflowY:"auto"}}>
                {/* Contador créditos */}
                <div style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontFamily:"sans-serif",fontSize:12,color:"#aaa"}}>Crédito: <b style={{color:"#fff"}}>{spent}</b>/80</span>
                    <span style={{fontFamily:"sans-serif",fontSize:12,fontWeight:"bold",color:remaining>=0?"#4caf50":"#ff6b6b"}}>{remaining>=0?`${remaining}k sobrante`:`${Math.abs(remaining)}k excedido`}</span>
                  </div>
                  <div style={{height:5,background:"rgba(255,255,255,0.08)",borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct}%`,background:remaining<0?"#ff6b6b":remaining===0?"#d4af37":"linear-gradient(90deg,#4caf50,#d4af37)",borderRadius:3,transition:"width 0.2s"}}/>
                  </div>
                  <div style={{display:"flex",gap:6,marginTop:6}}>
                    <span style={{fontSize:11,fontFamily:"sans-serif",padding:"2px 8px",borderRadius:10,background:has13>=1?"rgba(76,175,80,0.15)":"rgba(255,255,255,0.05)",color:has13>=1?"#4caf50":"#666"}}>13k: {has13}/1</span>
                    <span style={{fontSize:11,fontFamily:"sans-serif",padding:"2px 8px",borderRadius:10,background:has11>=1?"rgba(76,175,80,0.15)":"rgba(255,255,255,0.05)",color:has11>=1?"#4caf50":"#666"}}>11k: {has11}/1</span>
                    <span style={{fontSize:11,fontFamily:"sans-serif",padding:"2px 8px",borderRadius:10,background:"rgba(255,255,255,0.05)",color:"#666"}}>{ep.teams.length}/12 equipos</span>
                  </div>
                </div>

                {/* Búsqueda */}
                <input value={editSearch} onChange={e=>setEditSearch(e.target.value)}
                  placeholder="Buscar equipo o jugador..."
                  style={{...S.input,marginBottom:10}}/>

                {/* Equipos */}
                <div style={{fontFamily:"sans-serif",fontSize:12,color:"#d4af37",fontWeight:"bold",marginBottom:6}}>⚽ Equipos</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12,maxHeight:160,overflowY:"auto"}}>
                  {filtered.map(t=>{
                    const sel=ep.teams.includes(t);
                    const ok=canAdd(t);
                    return(
                      <button key={t} onClick={()=>{
                        if(sel){
                          setEditParticipant(prev=>({...prev,teams:prev.teams.filter(x=>x!==t)}));
                        } else if(ok){
                          setEditParticipant(prev=>({...prev,teams:[...prev.teams,t]}));
                        }
                      }} style={{padding:"5px 9px",borderRadius:16,border:"none",cursor:ok||sel?"pointer":"not-allowed",fontSize:12,fontFamily:"sans-serif",display:"flex",alignItems:"center",gap:4,
                        background:sel?"linear-gradient(135deg,#d4af37,#ff6b00)":ok?"rgba(255,255,255,0.07)":"rgba(255,255,255,0.02)",
                        color:sel?"#000":ok?"#ccc":"#444",opacity:ok||sel?1:0.4}}>
                        {t}<span style={{fontSize:10,color:sel?"rgba(0,0,0,0.5)":"#888"}}>{kOf(t)}k</span>
                      </button>
                    );
                  })}
                </div>

                {/* Jugadores */}
                <div style={{fontFamily:"sans-serif",fontSize:12,color:"#7b8fff",fontWeight:"bold",marginBottom:6}}>🌟 Jugadores ({ep.players.length}/3)</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5,maxHeight:130,overflowY:"auto"}}>
                  {filteredPlayers.map(pl=>{
                    const sel=ep.players.includes(pl);
                    return(
                      <button key={pl} onClick={()=>{
                        if(sel){
                          setEditParticipant(prev=>({...prev,players:prev.players.filter(x=>x!==pl)}));
                        } else if(ep.players.length<3){
                          setEditParticipant(prev=>({...prev,players:[...prev.players,pl]}));
                        } else {
                          toast_("Máximo 3 jugadores","err");
                        }
                      }} style={{padding:"5px 9px",borderRadius:16,border:"none",cursor:"pointer",fontSize:12,fontFamily:"sans-serif",
                        background:sel?"linear-gradient(135deg,#7b2fff,#00c6ff)":"rgba(255,255,255,0.07)",
                        color:sel?"#fff":"#ccc"}}>
                        {pl}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{padding:"12px 16px",borderTop:"1px solid rgba(255,255,255,0.08)",display:"flex",gap:8}}>
                <button onClick={()=>setEditParticipant(null)}
                  style={{flex:1,padding:"11px",borderRadius:10,border:"none",cursor:"pointer",background:"rgba(255,255,255,0.07)",color:"#ccc",fontSize:14,fontFamily:"sans-serif"}}>
                  Cancelar
                </button>
                <button onClick={()=>{
                  if(ep.teams.length!==12) return toast_("Deben ser exactamente 12 equipos","err");
                  if(ep.players.length!==3) return toast_("Deben ser exactamente 3 jugadores","err");
                  if(spent>MAX_KREDITU) return toast_("Excede los 80 créditos","err");
                  setPorra(prev=>({...prev,participants:prev.participants.map(x=>x.id===ep.id?{...x,teams:ep.teams,players:ep.players}:x)}));
                  addLog(`✏️ Editado ${ep.name}: equipos y jugadores modificados por admin`);
                  setEditParticipant(null);
                  toast_(`${ep.name} actualizado ✓`);
                }} style={{flex:2,padding:"11px",borderRadius:10,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#d4af37,#ff6b00)",color:"#000",fontSize:14,fontWeight:"bold",fontFamily:"sans-serif"}}>
                  ✓ Guardar cambios
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL CONFIRMACIÓN ── */}
      {confirmDialog&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 24px"}}>
          <div style={{background:"linear-gradient(160deg,#0d1520,#14081e)",borderRadius:16,border:"1px solid rgba(255,100,100,0.3)",padding:"24px 20px",maxWidth:380,width:"100%"}}>
            <div style={{fontFamily:"sans-serif",fontSize:15,color:"#fff",marginBottom:20,textAlign:"center"}}>{confirmDialog.msg}</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setConfirmDialog(null)}
                style={{flex:1,padding:"12px",borderRadius:10,border:"1px solid rgba(255,255,255,0.15)",background:"transparent",color:"#aaa",fontFamily:"sans-serif",fontSize:14,cursor:"pointer"}}>
                Cancelar
              </button>
              <button onClick={()=>{ confirmDialog.onOk(); setConfirmDialog(null); }}
                style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#c0392b,#e74c3c)",color:"#fff",fontFamily:"sans-serif",fontSize:14,fontWeight:"bold",cursor:"pointer"}}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL JUGADOR ── */}
      {playerDetail&&(()=>{
        const participant=participants.find(p=>p.id===playerDetail.participantId);
        if(!participant) return null;
        const phase = playerDetail.phase || null;
        const {rows,totalGoals,totalPts}=calcPlayerBreakdown(playerDetail.player, phase);
        // Para general también mostramos desglose por fases
        const phaseBreakdown = !phase ? PHASES_LIST.map(ph=>{
          const {totalGoals:g,totalPts:pts}=calcPlayerBreakdown(playerDetail.player,ph);
          return {ph,g,pts};
        }).filter(x=>x.g>0) : [];
        return(
          <div onClick={e=>{if(e.target===e.currentTarget)setPlayerDetail(null);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:1001,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",paddingTop:16,overflowY:"auto"}}>
            <div style={{width:"calc(100% - 24px)",maxWidth:460,background:"linear-gradient(160deg,#0d1520,#14081e)",borderRadius:18,border:"1px solid rgba(123,47,255,0.4)",overflow:"hidden",marginBottom:20}}>
              {/* Header */}
              <div style={{background:"linear-gradient(135deg,rgba(123,47,255,0.2),rgba(0,198,255,0.1))",padding:"16px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
                <div>
                  <div style={{fontSize:10,letterSpacing:4,color:"#7b8fff",textTransform:"uppercase",marginBottom:3}}>
                    {phase ? `Desglose · ${phase}` : "Desglose general"}
                  </div>
                  <div style={{fontSize:20,fontWeight:"bold",color:"#fff"}}>{playerDetail.player}</div>
                  <div style={{fontSize:12,fontFamily:"sans-serif",color:"#888",marginTop:2}}>de {participant.name}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:26,fontWeight:"bold",fontFamily:"sans-serif",color:"#d4af37"}}>{totalGoals}⚽</div>
                  <div style={{fontSize:13,fontFamily:"sans-serif",color:"#4caf50",fontWeight:"bold"}}>+{totalPts} pts</div>
                </div>
              </div>

              <div style={{padding:"12px 14px",maxHeight:"65vh",overflowY:"auto"}}>
                {/* Resumen por fases (solo en General) */}
                {phaseBreakdown.length>0&&(
                  <div style={{marginBottom:12,background:"rgba(212,175,55,0.06)",borderRadius:10,padding:"10px 13px",border:"1px solid rgba(212,175,55,0.15)"}}>
                    <div style={{fontFamily:"sans-serif",fontSize:11,color:"#d4af37",marginBottom:7,fontWeight:"bold"}}>Resumen por fases</div>
                    {phaseBreakdown.map(({ph,g,pts})=>(
                      <div key={ph} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,0.05)",fontFamily:"sans-serif",fontSize:12}}>
                        <span style={{color:"#bbb"}}>{ph}</span>
                        <span style={{color:"#888"}}>{g} gol{g>1?"es":""}</span>
                        <span style={{fontWeight:"bold",color:"#4caf50"}}>+{pts} pts</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Detalle partido a partido */}
                <div style={{fontFamily:"sans-serif",fontSize:11,color:"#888",marginBottom:8}}>
                  {phase ? `Partidos en ${phase}` : "Todos los partidos"}
                </div>
                {rows.length===0?(
                  <div style={{textAlign:"center",padding:"24px 0",fontFamily:"sans-serif",color:"#555"}}>
                    Sin goles {phase ? `en ${phase}` : "aún"}
                  </div>
                ):rows.map((row,i)=>(
                  <div key={i} style={{marginBottom:8,background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"11px 13px",border:"1px solid rgba(123,47,255,0.2)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:10,fontFamily:"sans-serif",color:"#7b8fff",marginBottom:3,textTransform:"uppercase",letterSpacing:2}}>{row.phase} · {row.date}</div>
                        <div style={{fontFamily:"sans-serif",fontSize:13,color:"#ddd"}}>{row.team1} <span style={{color:"#555"}}>vs</span> {row.team2}</div>
                        <div style={{fontFamily:"sans-serif",fontSize:11,color:"#666",marginTop:2}}>Resultado: {row.score1}–{row.score2}</div>
                        {/* Desglose del punto */}
                        <div style={{marginTop:5,display:"flex",alignItems:"center",gap:5,fontFamily:"sans-serif",fontSize:11}}>
                          <span style={{width:6,height:6,borderRadius:"50%",background:"#4caf50",display:"inline-block",flexShrink:0}}/>
                          <span style={{color:"#a8d8a8"}}>{row.goals} gol{row.goals>1?"es":""} × 0.75 pts = <span style={{fontWeight:"bold",color:"#4caf50"}}>+{row.pts} pts</span></span>
                        </div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0,marginLeft:12}}>
                        <div style={{fontSize:22,color:"#d4af37"}}>{row.goals}⚽</div>
                        <div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:13,color:"#4caf50"}}>+{row.pts}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{padding:"10px 14px",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
                <button onClick={()=>setPlayerDetail(null)} style={{width:"100%",padding:"11px",borderRadius:10,border:"none",cursor:"pointer",background:"rgba(255,255,255,0.07)",color:"#ccc",fontSize:14,fontFamily:"sans-serif"}}>Cerrar ×</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── POPUP PARTICIPANTES POR EQUIPO ── */}
      {pickerPopup&&(
        <div onClick={()=>setPickerPopup(null)} style={{position:"fixed",inset:0,zIndex:1500}}>
          <div onClick={e=>e.stopPropagation()} style={{
            position:"fixed",
            top:Math.min(pickerPopup.y+8, window.innerHeight-140),
            left:Math.min(Math.max(pickerPopup.x-80,8), window.innerWidth-200),
            background:"#1a2535",
            border:`1px solid ${T.accentBorder}`,
            borderRadius:10,padding:"10px 14px",
            zIndex:1501,minWidth:150,
            boxShadow:"0 4px 20px rgba(0,0,0,0.7)"
          }}>
            <div style={{fontFamily:"sans-serif",fontSize:11,color:T.primary,fontWeight:"bold",marginBottom:6}}>{flag(pickerPopup.team)} {pickerPopup.team}</div>
            {pickerPopup.names.length===0
              ? <div style={{fontFamily:"sans-serif",fontSize:12,color:"#555"}}>Nadie lo ha elegido</div>
              : pickerPopup.names.map(n=>(
                <div key={n} style={{fontFamily:"sans-serif",fontSize:12,color:"#ccc",padding:"2px 0"}}>👤 {n}</div>
              ))
            }
          </div>
        </div>
      )}

      {/* ── MODAL EQUIPO ── */}
      {teamDetail&&(()=>{
        const participant=participants.find(p=>p.id===teamDetail.participantId);
        if(!participant) return null;
        const phase = teamDetail.phase || null;
        const {rows,totalPts}=calcTeamBreakdown(teamDetail.team, participant.players, phase);
        const isGen = !phase;
        return(
          <div onClick={e=>{if(e.target===e.currentTarget)setTeamDetail(null);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:1000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",paddingTop:16,overflowY:"auto"}}>
            <div style={{width:"calc(100% - 24px)",maxWidth:460,background:"linear-gradient(160deg,#0d1520,#14081e)",borderRadius:18,border:"1px solid rgba(212,175,55,0.3)",overflow:"hidden",marginBottom:20}}>
              <div style={{background:"linear-gradient(135deg,rgba(212,175,55,0.15),rgba(255,107,0,0.1))",padding:"16px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
                <div>
                  <div style={{fontSize:10,letterSpacing:4,color:"#d4af37",textTransform:"uppercase",marginBottom:3}}>{isGen ? "Desglose general" : `Solo fase: ${phase}`}</div>
                  <div style={{fontSize:20,fontWeight:"bold",color:"#fff"}}>{teamDetail.team}</div>
                  <div style={{fontSize:12,fontFamily:"sans-serif",color:"#888",marginTop:2}}>de {participant.name}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:28,fontWeight:"bold",fontFamily:"sans-serif",color:"#d4af37"}}>{totalPts}</div>
                  <div style={{fontSize:10,fontFamily:"sans-serif",color:"#666"}}>pts totales</div>
                </div>
              </div>
              <div style={{padding:"12px 14px",maxHeight:"65vh",overflowY:"auto"}}>
                {rows.length===0?<div style={{textAlign:"center",padding:"30px 0",fontFamily:"sans-serif",color:"#555"}}>Aún no hay partidos jugados</div>:rows.map((row,i)=>(
                  <div key={i} style={{marginBottom:9,background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"11px 13px",border:`1px solid ${row.pts>0?"rgba(76,175,80,0.2)":row.pts<0?"rgba(255,100,100,0.2)":"rgba(255,255,255,0.07)"}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
                      <div>
                        <div style={{fontFamily:"sans-serif",fontSize:10,color:"#666",marginBottom:3}}>{row.phase} · {row.date}</div>
                        <div style={{fontFamily:"sans-serif",fontSize:13,color:"#ddd"}}><span style={{color:"#fff",fontWeight:"bold"}}>{teamDetail.team}</span><span style={{color:"#555",margin:"0 5px"}}>vs</span><span>{row.rival}</span></div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
                                         <div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:18,color:"#fff"}}>{row.result}</div>
                        <div style={{fontFamily:"sans-serif",fontWeight:"bold",fontSize:13,color:row.pts>0?"#4caf50":row.pts<0?"#ff6b6b":"#888"}}>{row.pts>0?"+":""}{row.pts} pts</div>
                      </div>
                    </div>
                    <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:6,display:"flex",flexDirection:"column",gap:3}}>
                      {row.bd.map((b,j)=>{
                        const isNeg=b.includes("-0.")||b.includes("en contra -");
                        const isPos=b.includes("+");
                        return(
                          <div key={j} style={{display:"flex",alignItems:"center",gap:6,fontFamily:"sans-serif",fontSize:12}}>
                            <span style={{width:6,height:6,borderRadius:"50%",background:isNeg?"#ff6b6b":isPos?"#4caf50":"#555",flexShrink:0,display:"inline-block"}}/>
                            <span style={{color:isNeg?"#ffaaaa":isPos?"#a8d8a8":"#999"}}>{b}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{padding:"10px 14px",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
                <button onClick={()=>setTeamDetail(null)} style={{width:"100%",padding:"11px",borderRadius:10,border:"none",cursor:"pointer",background:"rgba(255,255,255,0.07)",color:"#ccc",fontSize:14,fontFamily:"sans-serif"}}>Cerrar ×</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
