import type { Adoption } from "../lib/adminService";

/** Datos de diseño; no se usan si `USE_MOCK_ADOPTIONS` es `false` en `AdoptionsScreen`. */
export const MOCK_ADOPTIONS: Adoption[] = [
  {
    id: "mock-adopt-1",
    name: "Mila",
    age: "2 años",
    gender: "Hembra",
    description: "Tranquila, convive con gatos. Le encantan los paseos largos por el parque.",
    shelter: "Refugio Patitas CABA",
    location: "Villa Crespo",
    image_url: "https://picsum.photos/seed/adoptdog1/800/600",
    contact_url: "https://wa.me/5491112345678",
    is_active: true,
    created_at: "2025-02-01T10:00:00Z",
  },
  {
    id: "mock-adopt-2",
    name: "Simón",
    age: "8 meses",
    gender: "Macho",
    description: "Cachorro energético; busca familia con patio o muchas salidas a caminar.",
    shelter: null,
    location: "San Isidro",
    image_url: "https://picsum.photos/seed/adoptdog2/800/600",
    contact_url: null,
    is_active: true,
    created_at: "2025-01-28T10:00:00Z",
  },
  {
    id: "mock-adopt-3",
    name: "Nube",
    age: null,
    gender: "Hembra",
    description: "Gatita castrada, ideal departamento. Uso de arenero impecable.",
    shelter: "Asociación Gatos del Sur",
    location: "Lanús",
    image_url: null,
    contact_url: "https://instagram.com",
    is_active: true,
    created_at: "2025-01-15T10:00:00Z",
  },
];
