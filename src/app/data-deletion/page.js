export const metadata = {
    title: 'Eliminación de datos — Growth Brick',
    description: 'Instrucciones para solicitar la eliminación de tus datos en Growth Brick.',
};

export default function DataDeletionPage() {
    return (
        <main style={{ fontFamily: 'sans-serif', maxWidth: 640, margin: '60px auto', padding: '0 24px', color: '#1a1a1a', lineHeight: 1.7 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Eliminación de datos</h1>
            <p style={{ color: '#555', marginBottom: 32 }}>Última actualización: marzo 2026</p>

            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>¿Qué datos almacena Growth Brick?</h2>
            <p style={{ marginBottom: 24 }}>
                Growth Brick almacena únicamente los datos necesarios para conectar tu cuenta de Meta Ads:
            </p>
            <ul style={{ paddingLeft: 20, marginBottom: 24 }}>
                <li>Token de acceso de Meta (encriptado)</li>
                <li>ID de la cuenta publicitaria seleccionada</li>
                <li>ID del portfolio comercial vinculado</li>
                <li>Preferencias de visualización del dashboard</li>
            </ul>
            <p style={{ marginBottom: 24 }}>
                No almacenamos datos de campañas, métricas ni información de audiencias. Toda esa información se consulta directamente desde la API de Meta en tiempo real.
            </p>

            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Cómo solicitar la eliminación de tus datos</h2>
            <p style={{ marginBottom: 12 }}>Tenés dos opciones:</p>
            <ol style={{ paddingLeft: 20, marginBottom: 24 }}>
                <li style={{ marginBottom: 12 }}>
                    <strong>Desde la app:</strong> Iniciá sesión en Growth Brick, hacé clic en <em>Desconectar</em> en la sección de conexión de Meta. Esto elimina inmediatamente tu token y todos los datos asociados a tu cuenta.
                </li>
                <li style={{ marginBottom: 12 }}>
                    <strong>Por correo electrónico:</strong> Enviá un email a{' '}
                    <a href="mailto:hola@growthbrick.tech" style={{ color: '#1877F2' }}>hola@growthbrick.tech</a>{' '}
                    con el asunto <em>"Eliminación de datos"</em>. Procesaremos tu solicitud en un plazo de 30 días y te confirmaremos por email cuando esté completa.
                </li>
            </ol>

            <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Datos de Facebook / Meta</h2>
            <p style={{ marginBottom: 24 }}>
                Growth Brick accede a tu información de Meta Ads únicamente con tu autorización explícita. Podés revocar ese acceso en cualquier momento desde{' '}
                <a href="https://www.facebook.com/settings?tab=business_tools" target="_blank" rel="noopener noreferrer" style={{ color: '#1877F2' }}>
                    Configuración de Facebook → Aplicaciones y sitios web
                </a>
                {' '}buscando "Growth Brick" y eliminando el acceso.
            </p>

            <hr style={{ border: 'none', borderTop: '1px solid #e5e5e5', margin: '32px 0' }} />
            <p style={{ color: '#888', fontSize: 14 }}>
                Growth Brick · <a href="mailto:hola@growthbrick.tech" style={{ color: '#1877F2' }}>hola@growthbrick.tech</a>
            </p>
        </main>
    );
}
