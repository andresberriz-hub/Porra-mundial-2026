# Porra Mundial 2026 ⚽

## Pasos para publicar

### 1. Supabase — Base de datos (5 min)
1. Ve a supabase.com → Sign up → New project
2. En el **SQL Editor** ejecuta:

```sql
create table porra_state (
  id integer primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);
insert into porra_state (id, data) values (1, '{}');
alter table porra_state enable row level security;
create policy "Public access" on porra_state for all using (true) with check (true);
```

3. Ve a **Settings → API** y copia:
   - Project URL
   - anon/public key

### 2. GitHub — Repositorio (2 min)
1. Crea repo en github.com
2. Sube estos archivos respetando la estructura:
```
package.json
index.html
vite.config.js
src/App.jsx
src/main.jsx
src/supabase.js
```

### 3. Vercel — Publicación (2 min)
1. Ve a vercel.com → New Project → conecta el repo
2. Añade las variables de entorno:
   - `VITE_SUPABASE_URL` = tu Project URL
   - `VITE_SUPABASE_ANON_KEY` = tu anon key
3. Deploy → en 2 min tienes la URL

### URLs de acceso
- **Porra Eibar**: `tu-url.vercel.app?porra=eibar`
- **Porra Zumaia**: `tu-url.vercel.app?porra=zumaia`
- **Admin**: `tu-url.vercel.app` (sin parámetro, selector de porra)

### Contraseña admin
Por defecto: `AD1818`
Se puede cambiar desde ⚙️ Ajustes en el panel admin.

### Cambios futuros
1. Edita `src/App.jsx` con Claude
2. Sube el archivo a GitHub
3. Vercel publica automáticamente en ~2 min
4. Los datos en Supabase no se tocan nunca

### Para dos porras
Mismo código, misma URL. Los datos de Eibar y Zumaia 
están separados dentro de la misma base de datos.
