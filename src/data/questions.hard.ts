/**
 * SafeRacing — hard-mode question bank (80 questions).
 *
 * Primary source: GCBA, "Manual teórico de conducción de vehículos urbanos
 * de cuatro ruedas" (2023). The trailing comment of each entry gives the page
 * number printed on the page, which equals the PDF page index + 1.
 *
 * Speed limits (calles 40, avenidas 60, autopistas 100, semiautopistas 120,
 * rutas 110 for passenger cars) and the 0.2 g/L motorcycle alcohol limit come
 * from Ley Nacional de Tránsito 24.449, arts. 51 and 48(a): those figures sit
 * in graphics that the PDF text layer does not expose.
 *
 * Contract: { question, options[4], answer } — `answer` is the 0-based index
 * of the correct option. Same shape as the offline fallback in src/App.tsx.
 */

export interface Question {
  question: string;
  options: string[];
  answer: number;
}

const db_hard: Question[] = [
  // --- Prioridad de paso y señalización ---
  {
    question: 'En una intersección sin semáforo, entre arterías de igual jerarquía, ¿quién tiene la prioridad?',
    options: [
      'El vehículo de mayor porte',
      'El que llega antes a la bocacalle',
      'El que cruza por la derecha',
      'El que transporta más pasajeros',
    ],
    answer: 2,
  }, // manual p.64
  {
    question: '¿Cuál es el orden de jerarquía entre tipos de arteria, de mayor a menor importancia?',
    options: ['Pasaje, calle, avenida', 'Avenida, calle, pasaje', 'Calle, avenida, pasaje', 'Avenida, pasaje, calle'],
    answer: 1,
  }, // manual p.64
  {
    question: 'Frente a una señal de "Ceda el Paso", ¿qué diferencia hay con la señal de "Pare"?',
    options: [
      'Que solo se aplica en autopistas',
      'Que obliga a detenerse aunque no haya tráfico',
      'Que produce el mismo efecto que la señal de Pare',
      'Que la detención total no es obligatoria, salvo si facilita la circulación',
    ],
    answer: 3,
  }, // manual p.64
  {
    question: 'Al cruzar por nivel una vía férrea sin barrera en una intersección sin semáforo, ¿quién tiene la prioridad?',
    options: [
      'El vehículo que viene del lado de la vía férrea',
      'El que circula por la derecha',
      'El que viene a mayor velocidad',
      'El vehículo que sale del paso a nivel',
    ],
    answer: 3,
  }, // manual p.64
  {
    question: '¿Dónde debe detenerse el vehículo ante la luz roja de un semáforo?',
    options: [
      'En el centro de la intersección',
      'Después de la línea de detención, sobre la calzada',
      'Donde mejor se vea el semáforo',
      'Antes de la senda peatonal o de la línea de detención',
    ],
    answer: 3,
  }, // manual p.64
  {
    question: '¿Qué indica un semáforo con luz roja intermitente?',
    options: [
      'Que se puede avanzar con precaución',
      'Que la vía está desobstruida',
      'Que solo se puede girar a la izquierda',
      'Que hay que detener la marcha antes de la encrucijada y retomarla cuando no exista riesgo de cruzar',
    ],
    answer: 3,
  }, // manual p.64
  {
    question: 'Con luz verde, ¿cuál de estas NO es una precaución válida antes de iniciar el cruce?',
    options: [
      'Iniciar el cruce solo si hay espacio suficiente para ubicar el vehículo al otro lado',
      'Permitir que termine de cruzar quien ya había iniciado el paso',
      'Cruzar a máxima velocidad para no bloquear la vía',
      'Verificar que no se obstruya la circulación transversal',
    ],
    answer: 2,
  }, // manual p.64
  {
    question: 'Un vehículo estacionado quiere incorporarse a la circulación. ¿Cuándo tiene prioridad de paso?',
    options: [
      'Siempre, porque viene del cordón',
      'Nunca, en ningún caso',
      'Solo si se trata de un vehículo de emergencia',
      'Solo si el tránsito se encuentra interrumpido por alguna razón',
    ],
    answer: 3,
  }, // manual p.66
  {
    question: 'En una pendiente de ancho insuficiente para dos vehículos, ¿quién tiene la prioridad?',
    options: [
      'El que desciende, porque lo necesita con más urgencia',
      'El que lleva carga',
      'El último en llegar a la pendiente',
      'El que asciende, por necesitar más tracción y tener menor campo visual',
    ],
    answer: 3,
  }, // manual p.66
  {
    question: 'Entre una vía de tierra y una vía pavimentada que confluyen, ¿qué vehículo tiene la prioridad?',
    options: [
      'El que viene por la vía de tierra',
      'El de mayor velocidad',
      'El que llega último a la confluencia',
      'El que circula por la vía pavimentada',
    ],
    answer: 3,
  }, // manual p.66
  {
    question: '¿A quién se debe facilitar el reingreso a la circulación?',
    options: [
      'Al vehículo que realizó una maniobra de marcha atrás',
      'Al que transporta mayor cantidad de pasajeros',
      'Al que sale de un garaje',
      'Al colectivo que se detuvo en su parada',
    ],
    answer: 3,
  }, // manual p.66
  {
    question: 'Un vehículo de emergencia circula con las balizas encendidas pero sin sirena. ¿Tiene prioridad de paso?',
    options: [
      'Sí, porque es un vehículo de emergencia',
      'Sí, pero solo en autopistas',
      'No, porque las balizas son para uso de vehículos particulares',
      'No: con las balizas solamente está en servicio, pero no tiene prioridad de paso',
    ],
    answer: 3,
  }, // manual p.62
  {
    question: 'Un cordón pintado de color amarillo en la calzada indica:',
    options: [
      'Prohibición de estacionar durante las 24 horas',
      'Parada obligatoria de colectivos',
      'Carga y descarga de mercaderías',
      'Estacionamiento exclusivo de ciclorodados y motovehículos',
    ],
    answer: 0,
  }, // manual p.60
  {
    question: 'Un cordón pintado de color anaranjado indica:',
    options: [
      'Prohibición de detener el vehículo',
      'Paso obligatorio de peatones',
      'Estacionamiento reservado a taxis y remises',
      'Estacionamiento exclusivo de ciclorodados y motovehículos',
    ],
    answer: 3,
  }, // manual p.60
  {
    question: 'Un reductor de velocidad consiste en:',
    options: [
      'Un badén delimitado con pintura amarilla',
      'Una serie de conos naranjas sobre la calzada',
      'Una diferencia de rasante de 10 cm con señalización preventiva',
      'Un dispositivo que disminuye el ancho del carril hasta una dimensión no menor a 2,80 m e induce a reducir la velocidad',
    ],
    answer: 3,
  }, // manual p.10
  {
    question: 'Ante una contradicción entre normas y señales, ¿qué se respeta en primer lugar?',
    options: [
      'La señalización de la vía',
      'El criterio de quien conduce',
      'La costumbre del barrio',
      'Las indicaciones de los agentes de tránsito y de la autoridad de control',
    ],
    answer: 3,
  }, // manual p.58

  // --- Velocidad, distancia y condiciones de la vía ---
  {
    question: '¿Cuál es el límite máximo de velocidad en calles para un automóvil?',
    options: ['60 km/h', '40 km/h', '80 km/h', '110 km/h'],
    answer: 1,
  }, // Ley 24.449 art. 51
  {
    question: '¿Cuál es el límite máximo de velocidad en avenidas para un automóvil?',
    options: ['40 km/h', '80 km/h', '60 km/h', '100 km/h'],
    answer: 2,
  }, // Ley 24.449 art. 51
  {
    question: '¿Cuál es el límite máximo de velocidad en autopistas para un automóvil?',
    options: ['120 km/h', '100 km/h', '80 km/h', '60 km/h'],
    answer: 1,
  }, // Ley 24.449 art. 51
  {
    question: '¿Cuál es el límite máximo de velocidad en semiautopistas para un automóvil?',
    options: ['120 km/h', '80 km/h', '100 km/h', '60 km/h'],
    answer: 0,
  }, // Ley 24.449 art. 51
  {
    question: '¿Cuál es el límite máximo de velocidad en rutas para un automóvil?',
    options: ['100 km/h', '60 km/h', '120 km/h', '110 km/h'],
    answer: 3,
  }, // Ley 24.449 art. 51
  {
    question: '¿Cómo se fijan los límites mínimos de velocidad?',
    options: [
      'A la mitad de los límites máximos de cada tipo de arteria',
      'Deben ser iguales a los máximos',
      'A un tercio de los límites máximos',
      'Solo existen en autopistas',
    ],
    answer: 0,
  }, // manual p.73
  {
    question: '¿Cuál es la distancia mínima de seguridad entre vehículos que indica la ley?',
    options: ['1 segundo', '2 segundos', '3 segundos', '5 segundos'],
    answer: 1,
  }, // manual p.71
  {
    question: '¿Cuánto dura aproximadamente el tiempo de reacción de una persona que conduce?',
    options: ['1 segundo', '2 segundos', 'Medio segundo', '4 segundos'],
    answer: 0,
  }, // manual p.70
  {
    question: 'La distancia de detención es la suma de:',
    options: [
      'Distancia de reacción y distancia de frenado',
      'Distancia de frenado y espacio lateral',
      'Distancia de reacción y longitud del vehículo',
      'Espacio libre y distancia de frenado',
    ],
    answer: 0,
  }, // manual p.71
  {
    question: '¿Qué es el "efecto túnel" al conducir?',
    options: [
      'La pérdida de visión periférica por circular a alta velocidad',
      'La pérdida de la audición por el ruido del motor',
      'El retraso en la frenada por temperatura del freno',
      'La desorientación al salir de un túnel',
    ],
    answer: 0,
  }, // manual p.69
  {
    question: '¿Cómo se debe proceder al encontrar un bache sobre la calzada?',
    options: [
      'Aumentar la velocidad para atravesarlo antes de tiempo',
      'Disminuir la velocidad y aumentar la distancia de seguridad con el vehículo de adelante',
      'Mantener la velocidad para no perder el ritmo del tránsito',
      'Frenar solo después de pasar el bache',
    ],
    answer: 1,
  }, // manual p.74
  {
    question: 'Si el vehículo sale involuntariamente de la ruta, ¿qué corresponde hacer?',
    options: [
      'Desacelerar sin tratar de volver a la calzada dando volantazos',
      'Realizar una maniobra brusca de dirección para reencauzar el vehículo',
      'Mantener la velocidad hasta recuperar la trayectoria',
      'Frenar en seco y esperar asistencia en el lugar',
    ],
    answer: 0,
  }, // manual p.74
  {
    question: '¿Con qué antelación debe anticiparse una maniobra de giro?',
    options: ['Con la luz de giro unos 10 metros antes', 'Sin señalización previa', 'Con la luz de giro unos 30 metros antes', 'Solo al llegar a la esquina'],
    answer: 2,
  }, // manual p.75
  {
    question: '¿Cuál es el límite de velocidad en el Centro Peatonal?',
    options: ['10 km/h', '20 km/h', '30 km/h', '40 km/h'],
    answer: 0,
  }, // manual p.26
  {
    question: '¿Cuál es la velocidad máxima permitida en las calles de convivencia?',
    options: ['10 km/h', '20 km/h', '40 km/h', '60 km/h'],
    answer: 1,
  }, // manual p.26
  {
    question: 'Una persona que obtiene su licencia por primera vez, ¿qué restricción tiene durante los primeros 6 meses?',
    options: [
      'No puede conducir si llueve',
      'No puede circular por arterias donde se permitan velocidades superiores a 70 km/h',
      'No puede conducir después de las 20 horas',
      'No puede utilizar el cambio manual',
    ],
    answer: 1,
  }, // manual p.47
  {
    question: 'Si se conduce un automóvil con el cartel de principiante, ¿dónde debe exhibirse?',
    options: [
      'En el techo del vehículo',
      'En la parte inferior del parabrisas y en la luneta',
      'Dentro de la guantera',
      'Solo en el interior del baúl',
    ],
    answer: 1,
  }, // manual p.47
  {
    question: '¿Cuál es el límite de alcohol en sangre que se aplica a un conductor principiante?',
    options: [
      '0,5 g/L durante los primeros 6 meses',
      '0,2 g/L durante el primer año',
      '0,0 g/L durante los dos años de condición principiante',
      '0,5 g/L durante toda la vida de la licencia',
    ],
    answer: 2,
  }, // manual p.47
  {
    question: '¿Cuál es el límite general de alcohol en sangre para conducir en CABA?',
    options: ['1,0 g/L', '0,5 g/L', '0,2 g/L', '0,0 g/L'],
    answer: 1,
  }, // manual p.91
  {
    question: '¿Qué caracteriza a una autopista?',
    options: [
      'Tiene cruces a nivel y semáforos frecuentes',
      'No tiene cruces a nivel y sus accesos están controlados',
      'Es de un solo carril por sentido',
      'Sólo se usa para el transporte de mercancías',
    ],
    answer: 1,
  }, // manual p.10

  // --- Alcohol, fatiga y SienaBogota dependencies ---
  {
    question: '¿Cuál es el límite de alcohol en sangre permitido para conducir una motocicleta?',
    options: ['0,0 g/L', '0,5 g/L', '0,2 g/L', '0,8 g/L'],
    answer: 2,
  }, // Ley 24.449 art. 48(a)
  {
    question: 'Conducir con un nivel de alcohol igual o superior a 1,0 g/L es una conducta:',
    options: [
      'Administrativamente correcta si no hubo incidentes',
      'Contravencional, aun sin que haya producido daños',
      'Una falta de tránsito sin sanción',
      'Permitida si se conduce con un acompañante sobrio',
    ],
    answer: 1,
  }, // manual p.45
  {
    question: 'Si una persona se niega a realizarse la prueba de alcoholemia, la autoridad de control debe:',
    options: [
      'Dejar que continúe conduciendo si no hay antecedentes',
      'Advertirle solo por escrito y dejarlo pasar',
      'Prohibirle continuar conduciendo y ordenar la remoción del vehículo, presumiendo alcoholemia positiva',
      'Aplicarle una multa automática en el acto',
    ],
    answer: 2,
  }, // manual p.92
  {
    question: 'Una vez que se dejó de ingerir alcohol, ¿qué ocurre con la concentración en sangre durante la primera hora?',
    options: [
      'Baja inmediatamente a cero',
      'Baja a la mitad en los primeros diez minutos',
      'Continúa subiendo durante aproximadamente la primera hora',
      'Se mantiene constante durante toda la noche',
    ],
    answer: 2,
  }, // manual p.92
  {
    question: '¿Por qué se considera peligroso conducir con resaca?',
    options: [
      'Porque altera la coordinación, la atención y el tiempo de reacción, y se equipara a conducir alcoholizado',
      'Porque el cuerpo se deshidrata y falla la visión',
      'Porque el seguro no cubre los daños',
      'Porque la caldera del auto puede sobrecalentarse',
    ],
    answer: 0,
  }, // manual p.93
  {
    question: '¿Qué efecto tiene permanecer despierto 17 horas al volante?',
    options: [
      'Un aumento de la visión periférica',
      'El mismo nivel de reacción que una persona con alcohol en sangre por encima del permitido',
      'Una reducción del tiempo de frenado',
      'Ninguno, si se condujo con regularidad',
    ],
    answer: 1,
  }, // manual p.94
  {
    question: '¿Cada cuánto conviene interrumpir un viaje largo para descansar?',
    options: [
      'Cada 200 kilómetros o cada dos horas; en motovehículos, cada 100 kilómetros o cada hora',
      'Solo cada 500 kilómetros',
      'Solo al llegar al destino',
      'Cada 30 minutos, sin importar la distancia',
    ],
    answer: 0,
  }, // manual p.94
  {
    question: '¿Cuáles son los tres pasos que deben seguirse ante un siniestro vial?',
    options: [
      'Detenerse - Alertar - Esperar',
      'Proteger - Alertar - Socorrer',
      'Llamar - Consultar - Reparar',
      'Fotografiar - Mover - Avisar',
    ],
    answer: 1,
  }, // manual p.51
  {
    question: '¿A qué distancia conviene colocar las balizas portátiles de un vehículo inmovilizado?',
    options: [
      'En ciudad, a 30 y 60 metros; en ruta, al menos a 50 y 100 metros',
      'Siempre a 10 y 20 metros, en cualquier vía',
      'Solo a 5 metros del vehículo',
      'A 200 metros del vehículo, en autopistas',
    ],
    answer: 0,
  }, // manual p.51
  {
    question: 'Un vehículo queda inmovilizado dentro de un túnel. ¿Qué corresponde hacer?',
    options: [
      'Dejar las balizas encendidas y esperar adentro del auto',
      'Mantener luces de posición y balizas, apagar el motor y abandonar el vehículo usando el chaleco reflectante',
      'Encender solo las luces largas y permanecer sentado',
      'Caminar por el arcén hasta la salida a pie',
    ],
    answer: 1,
  }, // manual p.51
  {
    question: '¿A qué número se llama al servicio de Emergencias Médicas ante personas heridas?',
    options: ['911 y luego 107', '147 y luego 911', '107 y luego 911', '0800-222-3425'],
    answer: 2,
  }, // manual p.52
  {
    question: 'Ante una persona lesionada, ¿cuándo está permitido moverla?',
    options: [
      'Nunca, bajo ninguna circunstancia',
      'Cuando exista posibilidad de atropello o por una necesidad médica',
      'Siempre, para llevarla a un lugar seguro',
      'Solo si la persona está inconsciente',
    ],
    answer: 1,
  }, // manual p.53
  {
    question: 'Una persona lesionada lleva casco puesto. ¿Qué debe hacerse?',
    options: [
      'Retirarlo de inmediato para liberar la cabeza',
      'No retirarlo, salvo que haya vómito o asfixia',
      'Retirarlo solo si la persona se queja de dolor',
      'Retirarlo una vez trasladada al lugar de la cabecera',
    ],
    answer: 1,
  }, // manual p.53
  {
    question: 'Si una persona lesionada tiene un objeto clavado en el cuerpo, ¿qué corresponde?',
    options: [
      'Retirarlo para limpiar la herida',
      'No retirarlo, para no provocar una hemorragia',
      'Cortarlo con un cuchillo para liberarla',
      'Moverlo y revisar si hay hemorragia',
    ],
    answer: 1,
  }, // manual p.53
  {
    question: '¿Cuál es la edad mínima para obtener la licencia de las categorías generales?',
    options: [
      '16 años para ciclomotores, 17 años para las restantes categorías y 21 años para conductores profesionales',
      '18 años en todos los casos',
      '16 años en todos los casos',
      '21 años en todos los casos',
    ],
    answer: 0,
  }, // manual p.46
  {
    question: 'Si la licencia de conducir venció hace más de un año, ¿qué corresponde hacer?',
    options: [
      'Renovarla pagando una tasa',
      'Circular con una autorización transitoria',
      'Usarla hasta la próxima renovación obligatoria',
      'Tramitar un nuevo otorgamiento, como si fuera nueva',
    ],
    answer: 3,
  }, // manual p.46
  {
    question: '¿Con cuántos puntos se asigna el Scoring a quien obtiene su licencia por primera vez?',
    options: ['10 puntos', '20 puntos', '15 puntos', '25 puntos'],
    answer: 1,
  }, // manual p.55
  {
    question: 'Si una persona llega a 0 puntos y es retenida en la vía pública, ¿qué documento recibe?',
    options: [
      'Una boleta de citación que la habilita a conducir por un plazo máximo de 3 días hábiles',
      'Una licencia especial por 30 días',
      'Una multa a pagar en el acto',
      'Una copia de la licencia vencida',
    ],
    answer: 0,
  }, // manual p.55
  {
    question: '¿Cómo se pueden recuperar voluntariamente 4 puntos del Scoring?',
    options: [
      'Aprobando un curso especializado de educación vial, una sola vez por año',
      'Pagando una multa en el acto',
      'Con un examen médico renovatorio',
      'Presentando un reclamo administrativo',
    ],
    answer: 0,
  }, // manual p.55
  {
    question: '¿De qué color era la cédula de identificación del automotor que identificaba al titular del vehículo?',
    options: ['Verde', 'Marrón', 'Azul', 'Rosa'],
    answer: 0,
  }, // manual p.47

  // --- Documentación, detención y estacionamiento ---
  {
    question: '¿Cuándo corresponde la primera Verificación Técnica Vehicular de un automóvil particular radicado en CABA?',
    options: [
      'Al cumplir el primer año de antigüedad',
      'A los 100.000 kilómetros',
      'A partir del cuarto año de antigüedad cumplido, o a los 60.000 kilómetros',
      'Solo cuando cambia de propietario',
    ],
    answer: 2,
  }, // manual p.49
  {
    question: '¿Cuál es la vigencia de la VTV de un automóvil particular en los primeros años?',
    options: ['Un año', 'Seis meses', 'Dos años, hasta el octavo año de antigüedad o los 80.000 kilómetros', 'Cinco años'],
    answer: 2,
  }, // manual p.49
  {
    question: 'En una VTV con resultado "Condicional", ¿qué se debe hacer?',
    options: [
      'Resolver los defectos leves en un plazo de 60 días hábiles y volver a verificar sin cargo; el vehículo puede circular',
      'Retirar el vehículo de la vía pública de inmediato',
      'Repetir la VTV hasta obtener el resultado "Apto"',
      'Solicitar una VTV en otra jurisdicción',
    ],
    answer: 0,
  }, // manual p.50
  {
    question: '¿Dónde se adhiere la oblea de la Verificación Técnica Vehicular?',
    options: [
      'En el interior del vehículo, junto a la documentación',
      'En el tablero, del lado de quien conduce',
      'Al vidrio parabrisas; en el caso de los motovehículos, al dorso del certificado',
      'En el buzón del propietario',
    ],
    answer: 2,
  }, // manual p.50
  {
    question: '¿En qué plazo deben grabarse las autopartes de un vehículo radicado en CABA?',
    options: [
      'Dentro de los 30 días de patentamiento',
      'Dentro del primer año de antigüedad',
      'En cada Verificación Técnica Vehicular',
      'Solo si el vehículo es sustituido',
    ],
    answer: 0,
  }, // manual p.50
  {
    question: '¿En qué condiciones se considera detención a un vehículo inmóvil?',
    options: [
      'Cualquier vehículo detenido más de 5 minutos',
      'Cuando permanece sin movimiento hasta 2 minutos, sin que la persona que conduce abandone el vehículo',
      'Solo cuando tiene las balizas encendidas junto a la acera',
      'Cuando el motor está encendido y el vehículo no avanza',
    ],
    answer: 1,
  }, // manual p.83
  {
    question: 'En una vía férrea sin barreras, ¿qué distancia mínima debe guardar la detención respecto de los rieles?',
    options: ['2 metros', '10 metros', '3 metros', '5 metros'],
    answer: 3,
  }, // manual p.83
  {
    question: '¿En qué pasajes está prohibido estacionar?',
    options: ['En los de menos de 4,5 metros de ancho', 'En los de menos de 5 metros de ancho', 'En los de menos de 6 metros de ancho', 'En todos los pasajes',
    ],
    answer: 0,
  }, // manual pp.6, 84
  {
    question: '¿A qué distancia mínima de un paso ferroviario a nivel se puede estacionar?',
    options: ['100 metros', '10 metros', '50 metros', '5 metros'],
    answer: 2,
  }, // manual p.85
  {
    question: '¿A qué distancia de la entrada de una escuela, en horario de clase, está prohibido estacionar?',
    options: ['A menos de 10 metros a cada lado', 'A menos de 50 metros a cada lado', 'Solo frente a la puerta principal', 'No existe esa prohibición'],
    answer: 0,
  }, // manual p.85
  {
    question: '¿Cuánto tiempo puede permanecer un vehículo en un cajón azul?',
    options: ['Máximo 30 minutos, según la cartelería del lugar', 'Máximo 2 horas', 'Todo el día, si el vehículo es particular', 'Máximo 10 minutos'],
    answer: 0,
  }, // manual p.87
  {
    question: 'Al guardar el equipaje en el baúl, ¿qué conviene hacer con las piezas más pesadas?',
    options: [
      'Colocarlas arriba, para que no se mezclen con el equipaje liviano',
      'Colocarlas en el fondo del baúl, cerca del centro del vehículo',
      'Colocarlas en el asiento trasero',
      'Colocarlas en el portaequipajes sin sujetarlas',
    ],
    answer: 1,
  }, // manual p.119
  {
    question: '¿En qué casos está permitida la marcha atrás en la Ciudad de Buenos Aires?',
    options: [
      'Para estacionar, para entrar o salir de un garaje y para salvar algún obstáculo',
      'Solo para entrar a un garaje',
      'Nunca, en ninguna circunstancia',
      'Para superar un vehículo detenido',
    ],
    answer: 0,
  }, // manual p.86

  // --- Elementos de seguridad del vehículo ---
  {
    question: '¿Cuál es la función de los dibujos de un neumático en una calzada mojada?',
    options: [
      'Reducir el peso del vehículo',
      'Dar rigidez lateral al neumático',
      'Evacuar el agua de la zona de contacto para evitar el aquaplaning',
      'Aumentar la distancia de frenado',
    ],
    answer: 2,
  }, // manual p.108
  {
    question: '¿Cuántos años de antigüedad desde su fabricación es aceptable como máximo para un neumático?',
    options: ['Más de 8 años, si el dibujo está bien', '5 años', '3 años', '10 años'],
    answer: 1,
  }, // manual p.108
  {
    question: '¿Qué efecto tiene tener los amortiguadores en mal estado sobre la frenada?',
    options: [
      'Aumenta la distancia de frenado alrededor de un 10%',
      'Reduce la distancia de frenado',
      'Solo afecta al confort de la suspensión',
      'Mejora la adherencia en la calzada mojada',
    ],
    answer: 0,
  }, // manual p.107
  {
    question: '¿Cuál es la función del sistema ABS?',
    options: [
      'Bloquear las ruedas para que no patinen',
      'Evitar que las ruedas se bloqueen en una frenada brusca, liberando presión de frenado para recuperar adherencia',
      'Aumentar automáticamente la velocidad del vehículo',
      'Reducir el consumo de combustible',
    ],
    answer: 1,
  }, // manual p.107
  {
    question: '¿Quiénes deben usar cinturón de seguridad dentro de un automóvil?',
    options: [
      'Solo quien conduce y el acompañante delantero',
      'Solo las personas adultas',
      'Todos los ocupantes, en los asientos delanteros y traseros',
      'Solo los ocupantes que viajan en rutas',
    ],
    answer: 2,
  }, // manual p.111
  {
    question: '¿Cómo debe estar colocado el apoyacabeza?',
    options: [
      'A la altura de los hombros',
      'Inclinado hacia adelante, para apoyar la nuca',
      'A la altura de la línea de los ojos en su parte central y con la parte más elevada a la altura superior de la cabeza',
      'Solo a la altura de la nuca, sin ajuste',
    ],
    answer: 2,
  }, // manual p.113
  {
    question: '¿Qué debe usar un niño o una niña que viaje en un automóvil, según la normativa de CABA?',
    options: [
      'Cinturón abdominal de dos puntos hasta cumplir 8 años',
      'El cinturón del asiento delantero si viaja con un adulto',
      'El asiento delantero con airbag desactivado',
      'Un sistema de sujeción hasta los 12 años, o mientras mida menos de 1,50 m o pese menos de 36 kg',
    ],
    answer: 3,
  }, // manual p.114
  {
    question: '¿Cuál es la distancia lateral mínima recomendada al sobrepasar un ciclista?',
    options: ['1 metro', '1,5 metros', '3 metros', '5 metros'],
    answer: 1,
  }, // manual pp.34, 146
  {
    question: '¿Cuál es la potencia máxima del motor de un monopatín eléctrico?',
    options: ['250 W', '1500 W', '500 W', '1200 W'],
    answer: 2,
  }, // manual p.38
  {
    question: '¿Cuál es la velocidad máxima de una bicicleta con asistencia eléctrica?',
    options: ['20 km/h', '30 km/h', '45 km/h', '25 km/h'],
    answer: 3,
  }, // manual pp.33/38
  {
    question: '¿Cuál es la edad mínima para conducir una bicicleta con asistencia eléctrica o un monopatín eléctrico?',
    options: ['14 años', '15 años', '18 años', '16 años'],
    answer: 3,
  }, // manual pp.33/38
];

export default db_hard;
