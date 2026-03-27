export const metadata = {
    title: 'Política de Privacidad — Growth Brick',
    description: 'Política de privacidad de Growth Brick.',
};

export default function PrivacyPage() {
    return (
        <main style={{ fontFamily: 'sans-serif', maxWidth: 640, margin: '60px auto', padding: '0 24px', color: '#1a1a1a', lineHeight: 1.7 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Política de Privacidad</h1>
            <p style={{ color: '#555', marginBottom: 32 }}>Última actualización: marzo 2026</p>

            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>1. ¿Quiénes somos?</h2>
            <p style={{ marginBottom: 24 }}>
                Growth Brick es un dashboard de métricas para Meta Ads que permite a agencias y anunciantes visualizar el rendimiento de sus campañas publicitarias. Operado por Growth Brick · <a href="mailto:gonza.var@hotmail.com" style={{ color: '#1877F2' }}>gonza.var@hotmail.com</a>.
            </p>

            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>2. Qué datos recopilamos</h2>
            <p style={{ marginBottom: 12 }}>Recopilamos únicamente los datos necesarios para el funcionamiento del servicio:</p>
            <ul style={{ paddingLeft: 20, marginBottom: 24 }}>
                <li><strong>Datos de cuenta:</strong> nombre, email y contraseña (al registrarse con email/contraseña).</li>
                <li><strong>Token de acceso de Meta:</strong> el token que obtenemos con tu autorización para consultar la API de Meta Ads. Se almacena encriptado.</li>
                <li><strong>Configuración de la cuenta:</strong> ID de cuenta publicitaria seleccionada, portfolio comercial y preferencias de visualización.</li>
            </ul>
            <p style={{ marginBottom: 24 }}>
                <strong>No recopilamos</strong> datos de campañas, audiencias, creatividades ni métricas de manera permanente. Toda esa información se consulta en tiempo real desde la API de Meta y no se almacena en nuestros servidores.
            </p>

            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>3. Cómo usamos tus datos</h2>
            <ul style={{ paddingLeft: 20, marginBottom: 24 }}>
                <li>Para autenticarte y darte acceso al dashboard.</li>
                <li>Para conectarnos a la API de Meta Ads en tu nombre y mostrarte tus métricas.</li>
                <li>Para recordar tu cuenta publicitaria y preferencias seleccionadas.</li>
            </ul>
            <p style={{ marginBottom: 24 }}>No usamos tus datos para publicidad, no los vendemos ni los compartimos con terceros, salvo con los proveedores de infraestructura necesarios para operar el servicio (Supabase para base de datos, Vercel para hosting).</p>

            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>4. Datos de Meta / Facebook</h2>
            <p style={{ marginBottom: 24 }}>
                Growth Brick accede a tu información de Meta Ads únicamente con tu autorización explícita mediante Facebook Login. Los permisos que solicitamos son:
            </p>
            <ul style={{ paddingLeft: 20, marginBottom: 24 }}>
                <li><strong>ads_read:</strong> para leer métricas y datos de tus campañas publicitarias.</li>
                <li><strong>business_management:</strong> para listar tus portfolios comerciales y cuentas publicitarias.</li>
            </ul>
            <p style={{ marginBottom: 24 }}>
                Podés revocar estos permisos en cualquier momento desde{' '}
                <a href="https://www.facebook.com/settings?tab=business_tools" target="_blank" rel="noopener noreferrer" style={{ color: '#1877F2' }}>
                    Configuración de Facebook → Aplicaciones y sitios web
                </a>.
            </p>

            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>5. Seguridad</h2>
            <p style={{ marginBottom: 24 }}>
                Los tokens de acceso de Meta se almacenan encriptados en nuestra base de datos. Utilizamos HTTPS en todas las comunicaciones. Nunca exponemos tokens en el cliente ni en logs.
            </p>

            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>6. Retención y eliminación de datos</h2>
            <p style={{ marginBottom: 24 }}>
                Tus datos se conservan mientras tengas una cuenta activa en Growth Brick. Podés solicitar la eliminación de tus datos en cualquier momento siguiendo las instrucciones en nuestra{' '}
                <a href="/data-deletion" style={{ color: '#1877F2' }}>página de eliminación de datos</a>.
            </p>

            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>7. Contacto</h2>
            <p style={{ marginBottom: 24 }}>
                Para consultas sobre privacidad, escribinos a{' '}
                <a href="mailto:gonza.var@hotmail.com" style={{ color: '#1877F2' }}>gonza.var@hotmail.com</a>.
            </p>

            <hr style={{ border: 'none', borderTop: '1px solid #e5e5e5', margin: '32px 0' }} />
            <p style={{ color: '#888', fontSize: 14 }}>
                Growth Brick · <a href="mailto:gonza.var@hotmail.com" style={{ color: '#1877F2' }}>gonza.var@hotmail.com</a>
            </p>
        </main>
    );
}
