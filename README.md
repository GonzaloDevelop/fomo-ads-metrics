# Fomo Ads Metrics

Dashboard de métricas de Meta Ads. Visualizá el rendimiento de tus campañas, conjuntos y anuncios en tiempo real.

## Funcionalidades

- KPIs dinámicos según objetivo (Ventas, Mensajes, Leads, Tráfico)
- Gráfico de tendencia con comparación vs período anterior
- Tabla tipo Ads Manager con campañas, conjuntos y anuncios
- Mejores y peores anuncios con métricas adaptadas al objetivo
- ROAS Break-Even y CPR Break-Even por cuenta publicitaria
- Hook Rate para anuncios de video
- Distribución por región (pie chart)
- Funnel de conversión (para objetivos de ventas)
- Alertas configurables por métrica
- Panel de administración (aprobación de usuarios)
- Sistema de roles (owner, approved, pending)
- Modo claro / oscuro

---

## Instalación completa desde cero

### Requisitos previos

- Node.js 18+ instalado
- Una cuenta de GitHub
- Una cuenta de Supabase (gratis)
- Una cuenta de Vercel (gratis)
- Una cuenta de Meta for Developers

---

### Paso 1: Clonar el repositorio

```bash
git clone <url-del-repo>
cd meta-ads-metrics
npm install
```

---

### Paso 2: Crear proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá una cuenta (o iniciá sesión)
2. Click en **"New Project"**
3. Elegí un nombre (ej: `fomo-ads-metrics`), una contraseña para la DB, y la región más cercana
4. Esperá ~2 minutos a que se cree el proyecto
5. Una vez creado, andá a **Project Settings** (ícono de engranaje abajo a la izquierda)
6. En la sección **API**, copiá estos 3 valores:
   - **Project URL** → va a ser tu `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → va a ser tu `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret key** → va a ser tu `SUPABASE_SERVICE_ROLE_KEY`

---

### Paso 3: Crear las tablas en Supabase

1. En tu proyecto de Supabase, andá a **SQL Editor** (menú izquierdo)
2. Ejecutá cada archivo SQL **en orden** (copiá y pegá el contenido de cada uno y dale Run):

```
supabase/001_initial_schema.sql    ← Usuarios, conexiones Meta, RLS
supabase/002_user_settings.sql     ← Settings JSONB en user_profiles
supabase/003_sales_log.sql         ← Registro manual de ventas
supabase/004_alerts.sql            ← Sistema de alertas
supabase/005_alerts_permission.sql ← Permisos de alertas por usuario
supabase/006_google_connections.sql ← Conexiones Google Ads (próximamente)
```

> **Importante:** Antes de ejecutar `001_initial_schema.sql`, reemplazá `TU_EMAIL_DE_OWNER@ejemplo.com` con tu email real. Ese email va a ser el usuario "owner" (administrador) del dashboard.

---

### Paso 4: Configurar Auth en Supabase

1. En Supabase, andá a **Authentication** > **Providers**
2. Verificá que **Email** esté habilitado (viene habilitado por defecto)
3. (Opcional) En **Authentication** > **URL Configuration**, configurá el Site URL:
   - Local: `http://localhost:3001`
   - Producción: `https://tu-dominio.vercel.app`

---

### Paso 5: Configurar variables de entorno (local)

```bash
cp .env.local.example .env.local
```

Editá `.env.local` con tus valores:

```env
# Supabase (del Paso 2)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Encryption key para tokens en DB (generá uno con este comando):
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=tu_clave_hex_de_64_caracteres

# Tu email (el primer usuario con este email se convierte en owner/admin)
OWNER_EMAIL=tu@email.com

# Google Ads (dejar vacío por ahora - próximamente)
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_REDIRECT_URI=http://localhost:3001/api/google/callback
```

---

### Paso 6: Correr el proyecto en local

```bash
npm run dev
```

Abrí `http://localhost:3001` en el navegador. Deberías ver la pantalla de login.

1. Registrate con el email que pusiste en `OWNER_EMAIL`
2. Al ser el owner, tu cuenta se aprueba automáticamente
3. Vas a ver la pantalla para conectar Meta Ads

---

### Paso 7: Crear app en Meta for Developers

Si nunca creaste una app en Meta, seguí estos pasos:

1. Entrá a [developers.facebook.com/apps](https://developers.facebook.com/apps/)
2. Click en **"Crear una app"**
3. Ponele un nombre a la app (ej: "Mi Dashboard Ads")
4. Poné tu email de contacto
5. Click en **"Siguiente"**

#### Configurar casos de uso

1. En la pantalla de **"Casos de uso"**, seleccioná **"Anuncios y monetización"**
2. Marcá estas 3 opciones:
   - **Crear y administrar anuncios con la API de marketing**
   - **Medir datos de rendimiento de los anuncios con la API de marketing**
   - **Captar y administrar clientes potenciales de anuncios con la API de marketing**
3. Click en **"Siguiente"**

#### Conectar Portfolio Comercial

1. Seleccioná el portfolio donde tenés tus cuentas publicitarias (o las de tus clientes)
2. Click en **"Siguiente"** y luego **"Crear app"**

#### Obtener el Token

1. En el menú izquierdo, entrá a **"Casos de uso"**
2. En la primera opción ("Crear y administrar anuncios"), click en **"Personalizar"**
3. Click en **"Herramientas"** (barra lateral izquierda)
4. Marcá estos permisos: **ads_read** y **leads_retrieval**
5. Click en **"Obtener token"**
6. Copiá el token generado

> **Nota:** Este token dura ~1-2 horas. Para un token permanente, mirá la sección "System User Token" más abajo.

---

### Paso 8: Conectar Meta Ads en el dashboard

1. En el dashboard, pegá el token en el campo **"Access Token"**
2. (Opcional) Para System User Token, desplegá "Opciones avanzadas" y poné el ID de tu Portfolio Comercial
3. Click en **"Conectar"**
4. Seleccioná la cuenta publicitaria que quieras ver
5. Listo - el dashboard carga tus datos

---

## Deploy en Vercel (producción)

### Paso 1: Subir a GitHub

Si todavía no tenés el repo en GitHub:

```bash
git remote add origin https://github.com/tu-usuario/tu-repo.git
git push -u origin main
```

### Paso 2: Crear proyecto en Vercel

1. Entrá a [vercel.com](https://vercel.com) e iniciá sesión con GitHub
2. Click en **"Add New Project"**
3. Importá tu repositorio de GitHub
4. En **Root Directory**, poné `meta-ads-metrics` (si el repo tiene subcarpetas)
5. En **Framework Preset**, debería detectar Next.js automáticamente

### Paso 3: Configurar variables de entorno en Vercel

En la pantalla de configuración del proyecto, agregá estas Environment Variables:

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Tu URL de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tu anon key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Tu service role key de Supabase |
| `ENCRYPTION_KEY` | La misma clave hex de 64 caracteres |
| `OWNER_EMAIL` | Tu email de administrador |

### Paso 4: Deploy

1. Click en **"Deploy"**
2. Esperá ~1-2 minutos
3. Vercel te da una URL (ej: `tu-proyecto.vercel.app`)

### Paso 5: Actualizar Supabase

Volvé a Supabase > **Authentication** > **URL Configuration** y agregá tu URL de Vercel en:
- **Site URL**: `https://tu-proyecto.vercel.app`
- **Redirect URLs**: `https://tu-proyecto.vercel.app/**`

---

## Tokens de Meta: Tipos y duración

| Tipo | Duración | Cómo obtenerlo |
|------|----------|----------------|
| App Token (Casos de uso) | ~1-2 horas | developers.facebook.com > Tu app > Casos de uso > Herramientas |
| Graph API Explorer | ~1-2 horas | developers.facebook.com > Tools > Graph API Explorer |
| System User Token | **Permanente** | Business Manager > Configuración > Usuarios del sistema |

### Cómo crear un System User Token (permanente)

Para no tener que renovar el token cada 2 horas:

1. Entrá a [business.facebook.com/settings](https://business.facebook.com/settings/)
2. En el menú izquierdo: **Usuarios** > **Usuarios del sistema**
3. Click en **"Agregar"** y creá un System User (tipo **Admin**)
4. Asignale acceso a las cuentas publicitarias que necesites
5. Click en **"Generar token"**
6. Seleccioná tu app y marcá el permiso **ads_read**
7. Copiá el token y usalo en el dashboard

> Este token no expira. Es la opción recomendada para uso diario.

---

## Guía de uso del dashboard

### Filtros

- **Fecha:** Hoy, Ayer, 7D, 14D, 30D, Este mes, 90D, o rango personalizado
- **Estado:** Todos, Activos, Pausados
- **Objetivo:** Todos, Ventas, Mensajes, Leads, Tráfico, etc.
- **Ocultar sin inversión:** Filtra anuncios/campañas con $0 de gasto

### Break-Even

Botón **"Break-Even"** en la barra de filtros:
- **ROAS BE:** El ROAS mínimo para no perder plata (ej: 2.5x)
- **CPR BE:** El costo por resultado máximo (se adapta al objetivo: Costo por Compra, Costo por Mensaje, Costo por Lead, etc.)
- Se guarda por cuenta publicitaria
- Los anuncios por debajo del BE se marcan en rojo

### Mejores y peores anuncios

- Se adaptan automáticamente al objetivo seleccionado
- **Ventas:** Ordena por ROAS, muestra Compras, Facturación, CPA, Ticket Promedio
- **Mensajes:** Ordena por cantidad de mensajes, muestra Costo por Mensaje
- **Leads:** Ordena por cantidad de leads, muestra Costo por Lead
- Columnas configurables y persistentes por objetivo
- Paginación de 10 anuncios por tabla

### Métricas personalizadas

Botón **"Crear métrica"** para combinar métricas existentes (ej: Facturación / Compras = Ticket Promedio personalizado).

---

## Stack técnico

- **Frontend:** Next.js 16 + React 19 + Tailwind CSS 4
- **Backend:** Next.js Server Actions + API Routes
- **Base de datos:** Supabase (PostgreSQL + Auth + RLS)
- **Gráficos:** Chart.js + react-chartjs-2
- **UI Components:** shadcn/ui
- **Deploy:** Vercel

## Estructura del proyecto

```
src/
  app/
    _actions/       # Server Actions (meta.js, google.js, settings.js, auth.js, sales.js, alerts.js)
    _lib/           # Utilidades server-side (metaApi.js, googleAdsApi.js, encryption.js, session.js, dateUtils.js, metrics.js)
    components/     # Componentes React (KPICards, InsightsChart, AdsTable, SalesTracker, etc.)
    api/            # API Routes (alerts/check, google/callback)
    admin/          # Panel de administración (aprobar/rechazar usuarios)
    alerts/         # Sistema de alertas configurables
    login/          # Página de login/registro
    page.js         # Dashboard principal (server component)
    DashboardClient.jsx  # Cliente del dashboard (toda la lógica UI)
    globals.css     # Design tokens (dark/light mode)
  components/ui/    # Componentes base (shadcn)
  middleware.js     # Supabase session refresh
supabase/           # Scripts SQL para crear tablas
n8n/                # Workflow de n8n para alertas por email
```
