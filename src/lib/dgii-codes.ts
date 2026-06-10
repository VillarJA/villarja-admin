export interface DgiiLocation {
  code: string;
  nombre: string;
  tipo: 'provincia' | 'municipio';
}

export const DGII_LOCATIONS: DgiiLocation[] = [
  // ── Distrito Nacional ─────────────────────────────────────────────────────
  { code: '010000', nombre: 'Distrito Nacional', tipo: 'provincia' },
  { code: '010100', nombre: 'Santo Domingo de Guzmán', tipo: 'municipio' },

  // ── Azua ──────────────────────────────────────────────────────────────────
  { code: '020000', nombre: 'Azua', tipo: 'provincia' },
  { code: '020100', nombre: 'Azua', tipo: 'municipio' },
  { code: '020200', nombre: 'Las Charcas', tipo: 'municipio' },
  { code: '020300', nombre: 'Las Yayas de Viajama', tipo: 'municipio' },
  { code: '020400', nombre: 'Padre Las Casas', tipo: 'municipio' },
  { code: '020500', nombre: 'Peralta', tipo: 'municipio' },
  { code: '020600', nombre: 'Sabana Yegua', tipo: 'municipio' },
  { code: '020700', nombre: 'Pueblo Viejo', tipo: 'municipio' },
  { code: '020800', nombre: 'Tábara Arriba', tipo: 'municipio' },
  { code: '020900', nombre: 'Guayabal', tipo: 'municipio' },
  { code: '021000', nombre: 'Estebanía', tipo: 'municipio' },

  // ── Bahoruco ──────────────────────────────────────────────────────────────
  { code: '030000', nombre: 'Bahoruco', tipo: 'provincia' },
  { code: '030001', nombre: 'Neiba', tipo: 'municipio' },
  { code: '030200', nombre: 'Galván', tipo: 'municipio' },
  { code: '030300', nombre: 'Tamayo', tipo: 'municipio' },
  { code: '030400', nombre: 'Villa Jaragua', tipo: 'municipio' },
  { code: '030500', nombre: 'Los Ríos', tipo: 'municipio' },

  // ── Barahona ──────────────────────────────────────────────────────────────
  { code: '040000', nombre: 'Barahona', tipo: 'provincia' },
  { code: '040100', nombre: 'Barahona', tipo: 'municipio' },
  { code: '040200', nombre: 'Cabral', tipo: 'municipio' },
  { code: '040300', nombre: 'Enriquillo', tipo: 'municipio' },
  { code: '040400', nombre: 'Paraíso', tipo: 'municipio' },
  { code: '040500', nombre: 'Vicente Noble', tipo: 'municipio' },
  { code: '040600', nombre: 'El Peñón', tipo: 'municipio' },
  { code: '040700', nombre: 'La Ciénaga', tipo: 'municipio' },
  { code: '040800', nombre: 'Fundación', tipo: 'municipio' },
  { code: '040900', nombre: 'Las Salinas', tipo: 'municipio' },
  { code: '041000', nombre: 'Polo', tipo: 'municipio' },
  { code: '041100', nombre: 'Jaquimeyes', tipo: 'municipio' },

  // ── Dajabón ───────────────────────────────────────────────────────────────
  { code: '050000', nombre: 'Dajabón', tipo: 'provincia' },
  { code: '050100', nombre: 'Dajabón', tipo: 'municipio' },
  { code: '050200', nombre: 'Loma de Cabrera', tipo: 'municipio' },
  { code: '050300', nombre: 'Partido', tipo: 'municipio' },
  { code: '050400', nombre: 'Restauración', tipo: 'municipio' },
  { code: '050500', nombre: 'El Pino', tipo: 'municipio' },

  // ── Duarte ────────────────────────────────────────────────────────────────
  { code: '060000', nombre: 'Duarte', tipo: 'provincia' },
  { code: '060100', nombre: 'San Francisco de Macorís', tipo: 'municipio' },
  { code: '060200', nombre: 'Arenoso', tipo: 'municipio' },
  { code: '060300', nombre: 'Castillo', tipo: 'municipio' },
  { code: '060400', nombre: 'Pimentel', tipo: 'municipio' },
  { code: '060500', nombre: 'Villa Riva', tipo: 'municipio' },
  { code: '060600', nombre: 'Las Guáranas', tipo: 'municipio' },
  { code: '060700', nombre: 'Eugenio María de Hostos', tipo: 'municipio' },

  // ── Elías Piña ────────────────────────────────────────────────────────────
  { code: '070000', nombre: 'Elías Piña', tipo: 'provincia' },
  { code: '070100', nombre: 'Comendador', tipo: 'municipio' },
  { code: '070200', nombre: 'Bánica', tipo: 'municipio' },
  { code: '070300', nombre: 'El Llano', tipo: 'municipio' },
  { code: '070400', nombre: 'Hondo Valle', tipo: 'municipio' },
  { code: '070500', nombre: 'Pedro Santana', tipo: 'municipio' },
  { code: '070600', nombre: 'Juan Santiago', tipo: 'municipio' },

  // ── El Seibo ──────────────────────────────────────────────────────────────
  { code: '080000', nombre: 'El Seibo', tipo: 'provincia' },
  { code: '080100', nombre: 'El Seibo', tipo: 'municipio' },
  { code: '080200', nombre: 'Miches', tipo: 'municipio' },

  // ── Espaillat ─────────────────────────────────────────────────────────────
  { code: '090000', nombre: 'Espaillat', tipo: 'provincia' },
  { code: '090100', nombre: 'Moca', tipo: 'municipio' },
  { code: '090200', nombre: 'Cayetano Germosén', tipo: 'municipio' },
  { code: '090300', nombre: 'Gaspar Hernández', tipo: 'municipio' },
  { code: '090400', nombre: 'Jamao al Norte', tipo: 'municipio' },

  // ── Independencia ─────────────────────────────────────────────────────────
  { code: '100000', nombre: 'Independencia', tipo: 'provincia' },
  { code: '100100', nombre: 'Jimaní', tipo: 'municipio' },
  { code: '100200', nombre: 'Duvergé', tipo: 'municipio' },
  { code: '100300', nombre: 'La Descubierta', tipo: 'municipio' },
  { code: '100400', nombre: 'Postrer Río', tipo: 'municipio' },
  { code: '100500', nombre: 'Cristóbal', tipo: 'municipio' },
  { code: '100600', nombre: 'Mella', tipo: 'municipio' },

  // ── La Altagracia ─────────────────────────────────────────────────────────
  { code: '110000', nombre: 'La Altagracia', tipo: 'provincia' },
  { code: '110100', nombre: 'Higüey', tipo: 'municipio' },
  { code: '110200', nombre: 'San Rafael del Yuma', tipo: 'municipio' },

  // ── La Romana ─────────────────────────────────────────────────────────────
  { code: '120000', nombre: 'La Romana', tipo: 'provincia' },
  { code: '120100', nombre: 'La Romana', tipo: 'municipio' },
  { code: '120200', nombre: 'Guaymate', tipo: 'municipio' },
  { code: '120300', nombre: 'Villa Hermosa', tipo: 'municipio' },

  // ── La Vega ───────────────────────────────────────────────────────────────
  { code: '130000', nombre: 'La Vega', tipo: 'provincia' },
  { code: '130100', nombre: 'La Vega', tipo: 'municipio' },
  { code: '130200', nombre: 'Constanza', tipo: 'municipio' },
  { code: '130300', nombre: 'Jarabacoa', tipo: 'municipio' },
  { code: '130400', nombre: 'Jima Abajo', tipo: 'municipio' },

  // ── María Trinidad Sánchez ────────────────────────────────────────────────
  { code: '140000', nombre: 'María Trinidad Sánchez', tipo: 'provincia' },
  { code: '140100', nombre: 'Nagua', tipo: 'municipio' },
  { code: '140200', nombre: 'Cabrera', tipo: 'municipio' },
  { code: '140300', nombre: 'El Factor', tipo: 'municipio' },
  { code: '140400', nombre: 'Río San Juan', tipo: 'municipio' },

  // ── Monte Cristi ──────────────────────────────────────────────────────────
  { code: '150000', nombre: 'Monte Cristi', tipo: 'provincia' },
  { code: '150100', nombre: 'Monte Cristi', tipo: 'municipio' },
  { code: '150200', nombre: 'Castañuelas', tipo: 'municipio' },
  { code: '150300', nombre: 'Guayubín', tipo: 'municipio' },
  { code: '150400', nombre: 'Las Matas de Santa Cruz', tipo: 'municipio' },
  { code: '150500', nombre: 'Pepillo Salcedo', tipo: 'municipio' },
  { code: '150600', nombre: 'Villa Vásquez', tipo: 'municipio' },

  // ── Pedernales ────────────────────────────────────────────────────────────
  { code: '160000', nombre: 'Pedernales', tipo: 'provincia' },
  { code: '160100', nombre: 'Pedernales', tipo: 'municipio' },
  { code: '160200', nombre: 'Oviedo', tipo: 'municipio' },

  // ── Peravia ───────────────────────────────────────────────────────────────
  { code: '170000', nombre: 'Peravia', tipo: 'provincia' },
  { code: '170100', nombre: 'Baní', tipo: 'municipio' },
  { code: '170200', nombre: 'Nizao', tipo: 'municipio' },

  // ── Puerto Plata ──────────────────────────────────────────────────────────
  { code: '180000', nombre: 'Puerto Plata', tipo: 'provincia' },
  { code: '180100', nombre: 'Puerto Plata', tipo: 'municipio' },
  { code: '180200', nombre: 'Altamira', tipo: 'municipio' },
  { code: '180300', nombre: 'Guananico', tipo: 'municipio' },
  { code: '180400', nombre: 'Imbert', tipo: 'municipio' },
  { code: '180500', nombre: 'Los Hidalgos', tipo: 'municipio' },
  { code: '180600', nombre: 'Luperón', tipo: 'municipio' },
  { code: '180700', nombre: 'Sosúa', tipo: 'municipio' },
  { code: '180800', nombre: 'Villa Isabela', tipo: 'municipio' },
  { code: '180900', nombre: 'Villa Montellano', tipo: 'municipio' },

  // ── Hermanas Mirabal ──────────────────────────────────────────────────────
  { code: '190000', nombre: 'Hermanas Mirabal', tipo: 'provincia' },
  { code: '190100', nombre: 'Salcedo', tipo: 'municipio' },
  { code: '190200', nombre: 'Tenares', tipo: 'municipio' },
  { code: '190300', nombre: 'Villa Tapia', tipo: 'municipio' },

  // ── Samaná ────────────────────────────────────────────────────────────────
  { code: '200000', nombre: 'Samaná', tipo: 'provincia' },
  { code: '200100', nombre: 'Samaná', tipo: 'municipio' },
  { code: '200200', nombre: 'Sánchez', tipo: 'municipio' },
  { code: '200300', nombre: 'Las Terrenas', tipo: 'municipio' },

  // ── San Cristóbal ─────────────────────────────────────────────────────────
  { code: '210000', nombre: 'San Cristóbal', tipo: 'provincia' },
  { code: '210100', nombre: 'San Cristóbal', tipo: 'municipio' },
  { code: '210200', nombre: 'Sabana Grande de Palenque', tipo: 'municipio' },
  { code: '210300', nombre: 'Bajos de Haina', tipo: 'municipio' },
  { code: '210400', nombre: 'Cambita Garabitos', tipo: 'municipio' },
  { code: '210500', nombre: 'Villa Altagracia', tipo: 'municipio' },
  { code: '210600', nombre: 'Yaguate', tipo: 'municipio' },
  { code: '210700', nombre: 'San Gregorio de Nigua', tipo: 'municipio' },
  { code: '210800', nombre: 'Los Cacaos', tipo: 'municipio' },

  // ── San Juan ──────────────────────────────────────────────────────────────
  { code: '220000', nombre: 'San Juan', tipo: 'provincia' },
  { code: '220100', nombre: 'San Juan', tipo: 'municipio' },
  { code: '220200', nombre: 'Bohechío', tipo: 'municipio' },
  { code: '220300', nombre: 'El Cercado', tipo: 'municipio' },
  { code: '220400', nombre: 'Juan de Herrera', tipo: 'municipio' },
  { code: '220500', nombre: 'Las Matas de Farfán', tipo: 'municipio' },
  { code: '220600', nombre: 'Vallejuelo', tipo: 'municipio' },

  // ── San Pedro de Macorís ──────────────────────────────────────────────────
  { code: '230000', nombre: 'San Pedro de Macorís', tipo: 'provincia' },
  { code: '230100', nombre: 'San Pedro de Macorís', tipo: 'municipio' },
  { code: '230200', nombre: 'Los Llanos', tipo: 'municipio' },
  { code: '230300', nombre: 'Ramón Santana', tipo: 'municipio' },
  { code: '230400', nombre: 'Consuelo', tipo: 'municipio' },
  { code: '230500', nombre: 'Quisqueya', tipo: 'municipio' },
  { code: '230600', nombre: 'Guayacanes', tipo: 'municipio' },

  // ── Sánchez Ramírez ───────────────────────────────────────────────────────
  { code: '240000', nombre: 'Sánchez Ramírez', tipo: 'provincia' },
  { code: '240100', nombre: 'Cotuí', tipo: 'municipio' },
  { code: '240200', nombre: 'Cevicos', tipo: 'municipio' },
  { code: '240300', nombre: 'Fantino', tipo: 'municipio' },
  { code: '240400', nombre: 'La Mata', tipo: 'municipio' },

  // ── Santiago ──────────────────────────────────────────────────────────────
  { code: '250000', nombre: 'Santiago', tipo: 'provincia' },
  { code: '250100', nombre: 'Santiago', tipo: 'municipio' },
  { code: '250200', nombre: 'Bisonó', tipo: 'municipio' },
  { code: '250300', nombre: 'Jánico', tipo: 'municipio' },
  { code: '250400', nombre: 'Licey al Medio', tipo: 'municipio' },
  { code: '250500', nombre: 'San José de las Matas', tipo: 'municipio' },
  { code: '250600', nombre: 'Tamboril', tipo: 'municipio' },
  { code: '250700', nombre: 'Villa González', tipo: 'municipio' },
  { code: '250800', nombre: 'Puñal', tipo: 'municipio' },
  { code: '250900', nombre: 'Sabana Iglesia', tipo: 'municipio' },
  { code: '251000', nombre: 'Baitoa', tipo: 'municipio' },

  // ── Santiago Rodríguez ────────────────────────────────────────────────────
  { code: '260000', nombre: 'Santiago Rodríguez', tipo: 'provincia' },
  { code: '260100', nombre: 'San Ignacio de Sabaneta', tipo: 'municipio' },
  { code: '260200', nombre: 'Villa Los Almácigos', tipo: 'municipio' },
  { code: '260300', nombre: 'Monción', tipo: 'municipio' },

  // ── Valverde ──────────────────────────────────────────────────────────────
  { code: '270000', nombre: 'Valverde', tipo: 'provincia' },
  { code: '270100', nombre: 'Mao', tipo: 'municipio' },
  { code: '270200', nombre: 'Esperanza', tipo: 'municipio' },
  { code: '270300', nombre: 'Laguna Salada', tipo: 'municipio' },

  // ── Monseñor Nouel ────────────────────────────────────────────────────────
  { code: '280000', nombre: 'Monseñor Nouel', tipo: 'provincia' },
  { code: '280100', nombre: 'Bonao', tipo: 'municipio' },
  { code: '280200', nombre: 'Maimón', tipo: 'municipio' },
  { code: '280300', nombre: 'Piedra Blanca', tipo: 'municipio' },

  // ── Monte Plata ───────────────────────────────────────────────────────────
  { code: '290000', nombre: 'Monte Plata', tipo: 'provincia' },
  { code: '290100', nombre: 'Monte Plata', tipo: 'municipio' },
  { code: '290200', nombre: 'Bayaguana', tipo: 'municipio' },
  { code: '290300', nombre: 'Sabana Grande de Boyá', tipo: 'municipio' },
  { code: '290400', nombre: 'Yamasá', tipo: 'municipio' },
  { code: '290500', nombre: 'Peralvillo', tipo: 'municipio' },

  // ── Hato Mayor ────────────────────────────────────────────────────────────
  { code: '300000', nombre: 'Hato Mayor', tipo: 'provincia' },
  { code: '300100', nombre: 'Hato Mayor', tipo: 'municipio' },
  { code: '300200', nombre: 'Sabana de la Mar', tipo: 'municipio' },
  { code: '300300', nombre: 'El Valle', tipo: 'municipio' },

  // ── San José de Ocoa ──────────────────────────────────────────────────────
  { code: '310000', nombre: 'San José de Ocoa', tipo: 'provincia' },
  { code: '310100', nombre: 'San José de Ocoa', tipo: 'municipio' },
  { code: '310200', nombre: 'Sabana Larga', tipo: 'municipio' },
  { code: '310300', nombre: 'Rancho Arriba', tipo: 'municipio' },

  // ── Santo Domingo ─────────────────────────────────────────────────────────
  { code: '320000', nombre: 'Santo Domingo', tipo: 'provincia' },
  { code: '320100', nombre: 'Santo Domingo Este', tipo: 'municipio' },
  { code: '320200', nombre: 'Santo Domingo Oeste', tipo: 'municipio' },
  { code: '320300', nombre: 'Santo Domingo Norte', tipo: 'municipio' },
  { code: '320400', nombre: 'Boca Chica', tipo: 'municipio' },
  { code: '320500', nombre: 'San Antonio de Guerra', tipo: 'municipio' },
  { code: '320600', nombre: 'Los Alcarrizos', tipo: 'municipio' },
  { code: '320700', nombre: 'Pedro Brand', tipo: 'municipio' },
];

export function getProvincias(): DgiiLocation[] {
  return DGII_LOCATIONS.filter((l) => l.tipo === 'provincia');
}

export function getMunicipios(provinciaCode: string): DgiiLocation[] {
  const prefix = provinciaCode.slice(0, 2);
  return DGII_LOCATIONS.filter((l) => l.tipo === 'municipio' && l.code.startsWith(prefix));
}

export function getNombreUbicacion(code: string): string {
  return DGII_LOCATIONS.find((l) => l.code === code)?.nombre ?? code;
}
