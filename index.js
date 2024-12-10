import { neon } from '@neondatabase/serverless';
import express from 'express';
import { engine } from 'express-handlebars';

const sql = neon(
  'postgresql://neondb_owner:v73CLTVkneRE@ep-dark-rain-a5cdfdyo.us-east-2.aws.neon.tech/neondb?sslmode=require'
);

const app = express();
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

app.get('/', (req, res) => {
  res.render('home');
});

app.get('/estadio', async (req, res) => {
  try {
    const result = await sql`SELECT * FROM estadio`;
    res.render('estadio', { result });
  } catch (err) {
    console.error('Error al obtener los estadios:', err);
    res.status(500).send('Error al obtener los estadios');
  }
});

app.post('/estadio/buscar', async (req, res) => {
  const nombre = req.body.nombre;
  try {
    const result = await sql`
      SELECT e.nom_estadio
      FROM Partido p
      JOIN Estadio e ON p.id_estadio = e.id_estadio
      WHERE p.id_partido = ${nombre}
    `;

    let mensaje;
    if (result.length > 0) {
      mensaje = `El estadio "${result[0].nom_estadio}" está asociado al partido con ID ${nombre}.`;
    } else {
      mensaje = `No existe un estadio asociado al partido con ID ${nombre}.`;
    }

    const estadios = await sql`SELECT * FROM estadio`;
    res.render('estadio', { result: estadios, mensaje });
  } catch (err) {
    console.error('Error al buscar el estadio:', err);
    res.status(500).send('Error al procesar la solicitud');
  }
});

app.get('/hincha', async (req, res) => {
  res.render('hincha');
});

app.post('/hincha/buscar', async (req, res) => {
  const idPartido = req.body.id_partido;
  try {
    const result = await sql`
      SELECT COUNT(h.rut_fan) AS numero_hinchas
      FROM Hincha h
      WHERE h.id_equipo IN (
        SELECT r.id_equipo
        FROM Resultado r
        WHERE r.id_partido = ${idPartido}
      )
    `;

    let mensaje;
    if (result && result[0].numero_hinchas > 0) {
      mensaje = `El número de hinchas que asistieron al partido con ID ${idPartido} es ${result[0].numero_hinchas}.`;
    } else {
      mensaje = `No se encontraron hinchas para el partido con ID ${idPartido}.`;
    }

    res.render('hincha', { mensaje });
  } catch (err) {
    console.error('Error al buscar los hinchas:', err);
    res.status(500).send('Error al procesar la solicitud');
  }
});

app.get('/equipo', async (req, res) => {
  try {
    const result = await sql`SELECT * FROM equipo`;

    const menosGoleado = await sql`
      SELECT e.nom_equipo, SUM(r.goles_total) AS goles_recibidos
      FROM Resultado r
      JOIN Equipo e ON r.id_equipo = e.id_equipo
      GROUP BY e.nom_equipo
      ORDER BY SUM(r.goles_total) ASC
      FETCH FIRST 1 ROW ONLY;
    `;

    const massGoleado = await sql`
      SELECT e.nom_equipo, SUM(r.goles_total) AS goles_anotados
      FROM Resultado r
      JOIN Equipo e ON r.id_equipo = e.id_equipo
      GROUP BY e.nom_equipo
      ORDER BY SUM(r.goles_total) DESC
      FETCH FIRST 1 ROW ONLY;
    `;

    res.render('equipo', { result, menosGoleado, massGoleado });
  } catch (err) {
    console.error('Error al obtener los equipos:', err);
    res.status(500).send('Error al obtener los equipos');
  }
});

app.post('/equipo/dt', async (req, res) => {
  const idE = req.body.idE;
  try {
    const result = await sql`
      SELECT ct.nom_dt 
      FROM Equipo e
      JOIN Cuerpo_Tecnico ct ON e.id_ct = ct.id_ct
      WHERE e.id_equipo = ${idE};
    `;

    let mensaje;
    if (result && result.length > 0) {
      mensaje = `El director técnico del equipo con ID ${idE} es ${result[0].nom_dt}.`;
    } else {
      mensaje = `No se encontró al director técnico con ID ${idE} o no está vinculado a ningún equipo.`;
    }

    const equipos = await sql`SELECT * FROM Equipo`;

    const menosGoleado = await sql`
      SELECT e.nom_equipo, SUM(r.goles_total) AS goles_recibidos
      FROM Resultado r
      JOIN Equipo e ON r.id_equipo = e.id_equipo
      GROUP BY e.nom_equipo
      ORDER BY SUM(r.goles_total) ASC
      FETCH FIRST 1 ROW ONLY;
    `;

    const massGoleado = await sql`
      SELECT e.nom_equipo, SUM(r.goles_total) AS goles_anotados
      FROM Resultado r
      JOIN Equipo e ON r.id_equipo = e.id_equipo
      GROUP BY e.nom_equipo
      ORDER BY SUM(r.goles_total) DESC
      FETCH FIRST 1 ROW ONLY;
    `;

    res.render('equipo', {
      result: equipos,
      menosGoleado,
      massGoleado,
      mensaje,
    });
  } catch (err) {
    console.error('Error al buscar el director técnico y el equipo:', err);
    res.status(500).send('Error al procesar la solicitud');
  }
});

app.get('/estadistica', async (req, res) => {
  try {
    const estadisticas = await sql`SELECT * FROM estadisticas`;

    const maxGoleador = await sql`
      SELECT rut_jugador, MAX(goles) AS max_goles
      FROM estadisticas
      GROUP BY rut_jugador
      ORDER BY max_goles DESC
      LIMIT 1
    `;

    res.render('estadistica', { estadisticas, maxGoleador: maxGoleador[0] });
  } catch (err) {
    console.error('Error al obtener las estadísticas:', err);
    res.status(500).send('Error al obtener las estadísticas');
  }
});

app.post('/estadistica/buscar', async (req, res) => {
  const rutJugador = req.body.rut_jugador;
  try {
    const result = await sql`
      SELECT rut_jugador FROM estadisticas WHERE rut_jugador = ${rutJugador}
    `;

    let mensaje;
    if (result.length > 0) {
      mensaje = `El jugador con RUT ${rutJugador} tiene estadísticas registradas.`;
    } else {
      mensaje = `No se encontró al jugador con RUT ${rutJugador}.`;
    }

    const estadisticas = await sql`SELECT * FROM estadisticas`;
    res.render('estadistica', { estadisticas, mensaje });
  } catch (err) {
    console.error('Error al buscar el jugador:', err);
    res.status(500).send('Error al procesar la solicitud');
  }
});

app.get('/arbitro', async (req, res) => {
  try {
    const arbitros = await sql`SELECT id_arbitro, nom_arbitro FROM Arbitro`;
    res.render('arbitro', { arbitros });
  } catch (err) {
    console.error('Error al obtener la lista de árbitros:', err);
    res.status(500).send('Error al cargar la página de árbitros');
  }
});

app.post('/arbitro/buscar', async (req, res) => {
  const idArbitro = req.body.id_arbitro;
  try {
    const result = await sql`
      SELECT COUNT(*) AS partidos_dirigidos
      FROM Partido
      WHERE id_arbitro = ${idArbitro}
    `;

    let mensaje;
    if (result[0].partidos_dirigidos > 0) {
      mensaje = `El árbitro dirigió ${result[0].partidos_dirigidos} partido(s).`;
    } else {
      mensaje = 'El árbitro no dirigió ningún partido.';
    }

    const arbitros = await sql`SELECT id_arbitro, nom_arbitro FROM Arbitro`;
    res.render('arbitro', { arbitros, mensaje });
  } catch (err) {
    console.error(
      'Error al buscar los partidos dirigidos por el árbitro:',
      err
    );
    res.status(500).send('Error al procesar la solicitud');
  }
});

app.get('/jugador', async (req, res) => {
  try {
    const result = await sql`
      SELECT 
        j.nom_jugador, 
        j.posicion, 
        j.nacionalidad, 
        SUM(e.minutos_jugados) AS total_minutos
      FROM Jugador j
      INNER JOIN Estadisticas e ON j.rut_jugador = e.rut_jugador
      GROUP BY j.nom_jugador, j.posicion, j.nacionalidad
      ORDER BY total_minutos DESC
      LIMIT 1
    `;

    res.render('jugador', { result });
  } catch (err) {
    console.error('Error al obtener el jugador:', err);
    res.status(500).send('Error al cargar el jugador');
  }
});

app.post('/equipo/amarillas', async (req, res) => {
  try {
    const resultado = await sql`
      SELECT 
        e.nom_equipo,
        SUM(r.tarjetas_a) AS total_amarillas
      FROM Resultado r
      JOIN Equipo e ON r.id_equipo = e.id_equipo
      GROUP BY e.nom_equipo
      ORDER BY total_amarillas DESC
      LIMIT 1
    `;

    const equipoConMasAmarillas = resultado[0] || null;

    const equipos = await sql`
      SELECT 
        e.id_equipo,
        e.nom_equipo,
        e.ciudad
      FROM Equipo e
    `;

    res.render('equipo', {
      equipos,
      equipoConMasAmarillas,
    });
  } catch (err) {
    console.error('Error al obtener los equipos:', err);
    res.status(500).send('Error al cargar los datos del equipo.');
  }
});

app.post('/equipo', async (req, res) => {
  try {
    const resultado = await sql`
      SELECT 
        e.nom_equipo,
        SUM(r.tarjetas_r) AS total_rojas
      FROM Resultado r
      JOIN Equipo e ON r.id_equipo = e.id_equipo
      GROUP BY e.nom_equipo
      ORDER BY total_rojas DESC
      LIMIT 1
    `;

    const equipoConMasRojas = resultado[0] || null;

    const equipos = await sql`
      SELECT 
        e.id_equipo,
        e.nom_equipo,
        e.ciudad
      FROM Equipo e
    `;

    res.render('equipo', {
      equipos,
      equipoConMasRojas,
    });
  } catch (err) {
    console.error('Error al obtener los equipos:', err);
    res.status(500).send('Error al cargar los datos del equipo.');
  }
});

app.post('/estadistica/buscarAsistidor', async (req, res) => {
  try {
    const result = await sql`
      SELECT rut_jugador, MAX(asis) AS max_asistencias
      FROM Estadisticas
      GROUP BY rut_jugador
      ORDER BY max_asistencias DESC
      LIMIT 1
    `;

    let mensaje;
    if (result.length > 0) {
      mensaje = `El máximo asistidor de la liga es el jugador con RUT ${result[0].rut_jugador} con ${result[0].max_asistencias} asistencias.`;
    } else {
      mensaje = 'No se encontraron registros de asistencias en la liga.';
    }

    res.render('estadistica', { mensaje });
  } catch (err) {
    console.error('Error al buscar el máximo asistidor:', err);
    res.status(500).send('Error al procesar la solicitud');
  }
});

app.get('/arbitro', async (req, res) => {
  try {
    const arbitros = await sql`SELECT * FROM Arbitro`;

    res.render('arbitro', { arbitros });
  } catch (err) {
    console.error('Error al obtener los árbitros:', err);
    res.status(500).send('Error al obtener los árbitros');
  }
});

app.post('/arbitro/partidos', async (req, res) => {
  const idArbitro = req.body.id_arbitro;

  try {
    const result = await sql`
      SELECT COUNT(*) AS partidos_dirigidos
      FROM Partido
      WHERE id_arbitro = ${idArbitro}
    `;

    let mensaje;
    if (result && result[0].partidos_dirigidos > 0) {
      mensaje = `El árbitro con ID ${idArbitro} dirigió ${result[0].partidos_dirigidos} partido(s).`;
    } else {
      mensaje = `El árbitro con ID ${idArbitro} no dirigió ningún partido.`;
    }

    const arbitros = await sql`SELECT * FROM Arbitro`;
    res.render('arbitro', { arbitros, mensaje });
  } catch (err) {
    console.error('Error al buscar partidos dirigidos por el árbitro:', err);
    res.status(500).send('Error al procesar la solicitud');
  }
});

async function obtenerHinchasPorPartido(idPartido) {
  try {
    const hinchas = await sql`
      SELECT f.nom_fam, f.rut_fan, e.nom_equipo
      FROM Hincha h
      JOIN Fan f ON f.rut_fan = h.rut_fan
      JOIN Equipo e ON e.id_equipo = h.id_equipo
      WHERE e.id_equipo IN (
        SELECT r.id_equipo 
        FROM Resultado r 
        WHERE r.id_partido = ${idPartido}
      )
    `;
    return hinchas.rows;
  } catch (err) {
    console.error('Error al obtener los hinchas:', err);
    throw new Error('No se pudo obtener los hinchas');
  }
}

async function obtenerFansPorPartido() {
  try {
    const fans = await sql`
      SELECT f.rut_fan, f.nom_fam, e.nom_equipo
      FROM Hincha h
      JOIN Fan f ON h.rut_fan = f.rut_fan
      JOIN Equipo e ON h.id_equipo = e.id_equipo
      JOIN Partido p ON p.id_partido = 1  -- Aseguramos que se consulte solo para el partido con id_partido = 1
      WHERE p.id_partido = 1
      `;
    return fans;
  } catch (err) {
    console.error('Error al obtener los fans:', err);
    throw err;
  }
}

app.get('/fan', async (req, res) => {
  try {
    const partidos = await sql`SELECT * FROM Partido`;
    const fans = await obtenerFansPorPartido();

    res.render('fan', { partidos, fans });
  } catch (err) {
    console.error('Error al obtener los partidos o fans:', err);
    res.status(500).send('Error al obtener los partidos o fans');
  }
});

app.post('/jugador/agregar', async (req, res) => {
  try {
    const { nom_jugador, posicion, nacionalidad, rut_jugador, id_equipo } =
      req.body;

    if (
      !nom_jugador ||
      !posicion ||
      !nacionalidad ||
      !rut_jugador ||
      !id_equipo
    ) {
      return res.render('jugador', {
        error: 'Todos los campos son obligatorios.',
      });
    }

    await sql`
      INSERT INTO Jugador (rut_jugador, nom_jugador, posicion, nacionalidad, id_equipo)
      VALUES (${rut_jugador}, ${nom_jugador}, ${posicion}, ${nacionalidad}, ${id_equipo})
    `;

    res.render('jugador', {
      mensaje: 'Jugador agregado exitosamente.',
    });
  } catch (err) {
    console.error('Error al agregar el jugador:', err);
    res.render('jugador', {
      error: 'Error al agregar el jugador. Intenta nuevamente.',
    });
  }
});

app.post('/jugador/eliminar', async (req, res) => {
  try {
    const { rut_jugador } = req.body;
    if (!rut_jugador) {
      return res.status(400).send('RUT del jugador no proporcionado.');
    }
    const result = await sql`
      DELETE FROM Jugador
      WHERE rut_jugador = ${rut_jugador}
    `;
    if (result.count === 0) {
      return res.status(404).send('Jugador no encontrado.');
    }
    res.redirect('/jugador');
  } catch (err) {
    console.error('Error al eliminar el jugador:', err);
    res.status(500).send('Error al eliminar el jugador.');
  }
});

app.post('/arbitro/agregar', async (req, res) => {
  try {
    console.log(req.body);
    const { id_arbitro, nom_arbitro, años_exp, nacionalidad_e } = req.body;

    if (!id_arbitro || !nom_arbitro || !años_exp || !nacionalidad_e) {
      return res.render('arbitro', {
        error: 'Todos los campos son obligatorios.',
      });
    }

    await sql`
    INSERT INTO arbitro (id_arbitro, nom_arbitro, años_exp, nacionalidad_e)
    VALUES (${id_arbitro}, ${nom_arbitro}, ${años_exp}, ${nacionalidad_e})
  `;

    res.render('arbitro', {
      mensaje: 'Arbitro agregado exitosamente.',
    });
  } catch (err) {
    console.error('Error al agregar el arbitro:', err);
    res.render('arbitro', {
      error: 'Error al agregar el arbitro. Intenta nuevamente.',
    });
  }
});

app.post('/arbitro/eliminar', async (req, res) => {
  try {
    const { id_arbitro } = req.body;
    if (!id_arbitro) {
      return res.status(400).send('ID del árbitro no proporcionado.');
    }
    const result = await sql`
      DELETE FROM arbitro
      WHERE id_arbitro = ${id_arbitro}
    `;
    if (result.count === 0) {
      return res.status(404).send('Árbitro no encontrado.');
    }
    res.redirect('/arbitro');
  } catch (err) {
    console.error('Error al eliminar el árbitro:', err);
    res.status(500).send('Error al eliminar el árbitro.');
  }
});

app.post('/equipo/agregar', async (req, res) => {
  try {
    console.log(req.body);
    const { id_equipo, nom_equipo, id_ct, ciudad } = req.body;

    if (!id_equipo || !nom_equipo || !id_ct || !ciudad) {
      return res.render('equipo', {
        error: 'Todos los campos son obligatorios.',
      });
    }

    await sql`
    INSERT INTO equipo (id_equipo, nom_equipo, id_ct, ciudad)
    VALUES (${id_equipo}, ${nom_equipo}, ${id_ct}, ${ciudad})
  `;

    res.render('equipo', {
      mensaje: 'Equipo agregado exitosamente.',
    });
  } catch (err) {
    console.error('Error al agregar el equipo:', err);
    res.render('equipo', {
      error: 'Error al agregar el equipo. Intenta nuevamente.',
    });
  }
});

app.post('/equipo/eliminar', async (req, res) => {
  try {
    const { id_equipo } = req.body;
    if (!id_equipo) {
      return res.status(400).send('ID del equipo no proporcionado.');
    }
    const result = await sql`
      DELETE FROM equipo
      WHERE id_equipo = ${id_equipo}
    `;
    if (result.count === 0) {
      return res.status(404).send('Equipo no encontrado.');
    }
    res.redirect('/equipo');
  } catch (err) {
    console.error('Error al eliminar el equipo:', err);
    res.status(500).send('Error al eliminar el equipo.');
  }
});

app.get('/cuerpo', async (req, res) => {
  try {
    const arbitros = await sql`SELECT * FROM cuerpo_tecnico`;
    res.render('cuerpo', { arbitros });
  } catch (err) {
    console.error('Error al obtener la lista de cuerpos tecnicos:', err);
    res.status(500).send('Error al cargar la página de cuerpos tecnicos');
  }
});

app.post('/cuerpo/agregar', async (req, res) => {
  try {
    console.log(req.body);
    const { id_ct, nom_dt, nom_asis } = req.body;

    if (!id_ct || !nom_dt || !nom_asis) {
      return res.render('cuerpo', {
        error: 'Todos los campos son obligatorios.',
      });
    }

    await sql`
    INSERT INTO cuerpo_tecnico (id_ct, nom_dt, nom_asis)
    VALUES (${id_ct}, ${nom_dt}, ${nom_asis})
  `;

    res.render('cuerpo', {
      mensaje: 'Cuerpo Tecnico agregado exitosamente.',
    });
  } catch (err) {
    console.error('Error al agregar el cuerpo tecnico:', err);
    res.render('cuerpo', {
      error: 'Error al agregar el cuerpo tecnico. Intenta nuevamente.',
    });
  }
});

app.post('/cuerpo/eliminar', async (req, res) => {
  try {
    const { id_ct } = req.body;
    if (!id_ct) {
      return res.status(400).send('ID del cuerpo técnico no proporcionado.');
    }
    const result = await sql`
      DELETE FROM cuerpo_tecnico
      WHERE id_ct = ${id_ct}
    `;
    if (result.count === 0) {
      return res.status(404).send('Cuerpo técnico no encontrado.');
    }
    res.redirect('/cuerpo');
  } catch (err) {
    console.error('Error al eliminar el cuerpo técnico:', err);
    res.status(500).send('Error al eliminar el cuerpo técnico.');
  }
});

app.post('/estadio/agregar', async (req, res) => {
  try {
    console.log(req.body);
    const { id_estadio, nom_estadio, ubicacion, asientos_disponibles } =
      req.body;

    if (!id_estadio || !nom_estadio || !ubicacion || !asientos_disponibles) {
      return res.render('estadio', {
        error: 'Todos los campos son obligatorios.',
      });
    }

    await sql`
    INSERT INTO estadio (id_estadio, nom_estadio, ubicacion,asientos_disponibles )
    VALUES (${id_estadio}, ${nom_estadio}, ${ubicacion}, ${asientos_disponibles})
  `;

    res.render('estadio', {
      mensaje: 'Estadio agregado exitosamente.',
    });
  } catch (err) {
    console.error('Error al agregar el estadio:', err);
    res.render('cuerpo', {
      error: 'Error al agregar el estadio. Intenta nuevamente.',
    });
  }
});

app.post('/estadio/eliminar', async (req, res) => {
  try {
    const { id_estadio } = req.body;
    if (!id_estadio) {
      return res.status(400).send('ID del estadio no proporcionado.');
    }
    const result = await sql`
      DELETE FROM estadio
      WHERE id_estadio = ${id_estadio}
    `;
    if (result.count === 0) {
      return res.status(404).send('Estadio no encontrado.');
    }
    res.redirect('/estadio');
  } catch (err) {
    console.error('Error al eliminar el estadio:', err);
    res.status(500).send('Error al eliminar el estadio.');
  }
});

app.post('/estadistica/agregar', async (req, res) => {
  try {
    console.log(req.body);
    const {
      id_estadistica,
      goles,
      asis,
      minutos_jugados,
      id_partido,
      rut_jugador,
    } = req.body;

    if (
      !id_estadistica ||
      !goles ||
      !asis ||
      !minutos_jugados ||
      !id_partido ||
      !rut_jugador
    ) {
      return res.render('estadistica', {
        error: 'Todos los campos son obligatorios.',
      });
    }

    await sql`
    INSERT INTO estadisticas (id_estadistica, goles, asis,minutos_jugados, id_partido,rut_jugador)
    VALUES (${id_estadistica}, ${goles}, ${asis}, ${minutos_jugados}, ${id_partido}, ${rut_jugador})
  `;

    res.render('estadistica', {
      mensaje: 'Estadística agregado exitosamente.',
    });
  } catch (err) {
    console.error('Error al agregar la estadística:', err);
    res.render('cuerpo', {
      error: 'Error al agregar la estadística. Intenta nuevamente.',
    });
  }
});

app.post('/estadistica/eliminar', async (req, res) => {
  try {
    const { id_estadistica } = req.body;
    if (!id_estadistica) {
      return res.status(400).send('ID de la estadística no proporcionado.');
    }

    const result = await sql`
      DELETE FROM estadisticas
      WHERE id_estadistica = ${id_estadistica}
    `;

    if (result.count === 0) {
      return res.status(404).send('Estadística no encontrada.');
    }

    res.redirect('/estadistica');
  } catch (err) {
    console.error('Error al eliminar la estadística:', err);
    res.status(500).send('Error al eliminar la estadística.');
  }
});

app.post('/hincha/agregar', async (req, res) => {
  try {
    console.log(req.body);
    const { id_equipo, rut_fan } = req.body;

    if (!id_equipo || !rut_fan) {
      return res.render('hincha', {
        error: 'Todos los campos son obligatorios.',
      });
    }

    await sql`
    INSERT INTO hincha (id_equipo, rut_fan )
    VALUES (${id_equipo}, ${rut_fan})
  `;

    res.render('hincha', {
      mensaje: 'Hincha agregado exitosamente.',
    });
  } catch (err) {
    console.error('Error al agregar al hincha:', err);
    res.render('hincha', {
      error: 'Error al agregar al hincha. Intenta nuevamente.',
    });
  }
});

app.post('/hincha/eliminar', async (req, res) => {
  try {
    const { id_equipo, rut_fan } = req.body;
    if (!id_equipo || !rut_fan) {
      return res
        .status(400)
        .send('ID de equipo y RUT del fan son obligatorios.');
    }

    const result = await sql`
      DELETE FROM hincha
      WHERE id_equipo = ${id_equipo} AND rut_fan = ${rut_fan}
    `;

    if (result.count === 0) {
      return res.status(404).send('Hincha no encontrado.');
    }

    res.redirect('/hincha');
  } catch (err) {
    console.error('Error al eliminar al hincha:', err);
    res.status(500).send('Error al eliminar al hincha.');
  }
});

app.post('/fan/agregar', async (req, res) => {
  try {
    console.log(req.body);
    const { rut_fan, nom_fam } = req.body;

    if (!rut_fan || !nom_fam) {
      return res.render('fan', {
        error: 'Todos los campos son obligatorios.',
      });
    }

    await sql`
    INSERT INTO fan (rut_fan, nom_fam )
    VALUES (${rut_fan}, ${nom_fam})
  `;

    res.render('fan', {
      mensaje: 'Fan agregado exitosamente.',
    });
  } catch (err) {
    console.error('Error al agregar al fan:', err);
    res.render('fan', {
      error: 'Error al agregar al fan. Intenta nuevamente.',
    });
  }
});

app.post('/fan/eliminar', async (req, res) => {
  try {
    const { rut_fan } = req.body;
    if (!rut_fan) {
      return res.status(400).send('RUT del fan no proporcionado.');
    }
    const result = await sql`
      DELETE FROM fan
      WHERE rut_fan = ${rut_fan}
    `;
    if (result.count === 0) {
      return res.status(404).send('Fan no encontrado.');
    }
    res.redirect('/fan');
  } catch (err) {
    console.error('Error al eliminar al fan:', err);
    res.status(500).send('Error al eliminar al fan.');
  }
});

app.get('/partido', async (req, res) => {
  try {
    const arbitros = await sql`SELECT * FROM partido`;
    res.render('partido', { arbitros });
  } catch (err) {
    console.error('Error al obtener la lista de partidos:', err);
    res.status(500).send('Error al cargar la página de partidos');
  }
});

app.post('/partido/agregar', async (req, res) => {
  try {
    console.log(req.body);
    const { id_partido, id_estadio, id_liga, id_arbitro } = req.body;

    if (!id_partido || !id_estadio || !id_liga || !id_arbitro) {
      return res.render('partido', {
        error: 'Todos los campos son obligatorios.',
      });
    }

    await sql`
    INSERT INTO partido (id_partido, id_estadio, id_liga,id_arbitro )
    VALUES (${id_partido}, ${id_estadio}, ${id_liga}, ${id_arbitro})
  `;

    res.render('partido', {
      mensaje: 'Partido agregado exitosamente.',
    });
  } catch (err) {
    console.error('Error al agregar el partido:', err);
    res.render('partido', {
      error: 'Error al agregar el partido. Intenta nuevamente.',
    });
  }
});

app.post('/partido/eliminar', async (req, res) => {
  try {
    const { id_partido } = req.body;
    if (!id_partido) {
      return res.status(400).send('ID de partido no proporcionado.');
    }

    const result = await sql`
      DELETE FROM partido
      WHERE id_partido = ${id_partido}
    `;

    if (result.count === 0) {
      return res.status(404).send('Partido no encontrado.');
    }
    res.redirect('/partido');
  } catch (err) {
    console.error('Error al eliminar el partido:', err);
    res.status(500).send('Error al eliminar el partido.');
  }
});

app.get('/resultado', async (req, res) => {
  try {
    const arbitros = await sql`SELECT * FROM resultado`;
    res.render('resultado', { arbitros });
  } catch (err) {
    console.error('Error al obtener la lista de resultados:', err);
    res.status(500).send('Error al cargar la página de resultados');
  }
});

app.post('/resultado/agregar', async (req, res) => {
  try {
    console.log(req.body);
    const {
      id_resultado,
      goles_total,
      tarjetas_r,
      tarjetas_a,
      posesion_balon,
      id_partido,
      id_equipo,
    } = req.body;

    if (
      !id_resultado ||
      !goles_total ||
      !tarjetas_r ||
      !tarjetas_a ||
      !posesion_balon ||
      !id_partido ||
      !id_equipo
    ) {
      return res.render('resultado', {
        error: 'Todos los campos son obligatorios.',
      });
    }

    await sql`
    INSERT INTO resultado (id_resultado, goles_total, tarjetas_r, tarjetas_a, posesion_balon, id_partido, id_equipo)
    VALUES (${id_resultado}, ${goles_total}, ${tarjetas_r}, ${tarjetas_a}, ${posesion_balon}, ${id_partido}, ${id_equipo}) `;

    res.render('resultado', {
      mensaje: 'Resultado agregado exitosamente.',
    });
  } catch (err) {
    console.error('Error al agregar el resultado:', err);
    res.render('partido', {
      error: 'Error al agregar el resultado. Intenta nuevamente.',
    });
  }
});

app.post('/resultado/eliminar', async (req, res) => {
  try {
    const { id_resultado } = req.body;

    if (!id_resultado) {
      return res.status(400).send('ID de resultado no proporcionado.');
    }
    const result = await sql`
      DELETE FROM resultado
      WHERE id_resultado = ${id_resultado}
    `;
    if (result.count === 0) {
      return res.status(404).send('Resultado no encontrado.');
    }

    res.redirect('/resultado');
  } catch (err) {
    console.error('Error al eliminar el resultado:', err);
    res.status(500).send('Error al eliminar el resultado.');
  }
});

app.get('/liga', async (req, res) => {
  try {
    const liga = await sql`SELECT * FROM liga`;
    console.log(liga);
    res.render('liga', { liga });
  } catch (err) {
    console.error('Error al obtener la liga:', err);
    res.status(500).send('Error al cargar la página de liga');
  }
});

app.post('/liga/agregar', async (req, res) => {
  try {
    console.log(req.body);
    const { id_liga, nom_liga, fecha_inicio, fecha_termino } = req.body;

    if (!id_liga || !nom_liga || !fecha_inicio || !fecha_termino) {
      return res.render('liga', {
        error: 'Todos los campos son obligatorios.',
      });
    }

    await sql`
    INSERT INTO liga (id_liga, nom_liga, fecha_inicio,fecha_termino )
    VALUES (${id_liga}, ${nom_liga}, ${fecha_inicio}, ${fecha_termino})
  `;

    res.render('liga', {
      mensaje: 'Liga agregada exitosamente.',
    });
  } catch (err) {
    console.error('Error al agregar la liga:', err);
    res.render('liga', {
      error: 'Error al agregar la liga. Intenta nuevamente.',
    });
  }
});

app.post('/liga/eliminar', async (req, res) => {
  try {
    const { id_liga } = req.body;

    if (!id_liga) {
      return res.status(400).send('ID de liga no proporcionado.');
    }

    const result = await sql`
      DELETE FROM liga
      WHERE id_liga = ${id_liga}
    `;

    if (result.count === 0) {
      return res.status(404).send('Liga no encontrada.');
    }

    res.redirect('/liga');
  } catch (err) {
    console.error('Error al eliminar la liga:', err);
    res.status(500).send('Error al eliminar la liga.');
  }
});

app.listen(3000, () => console.log('Servidor escuchando en el puerto 3000'));
