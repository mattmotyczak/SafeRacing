/**
 * SafeRacing — easy-mode question bank (30 questions).
 *
 * Source: conceptual road-safety basics written for teenagers. Facts are
 * cross-checked against the GCBA "Manual teórico de conducción de vehículos
 * urbanos de cuatro ruedas" (2023) wherever they appear in its text layer;
 * age and speed thresholds come from Ley Nacional de Tránsito 24.449.
 *
 * Contract: { question, options[4], answer } — `answer` is the 0-based index
 * of the correct option. Same shape as the offline fallback in src/App.tsx.
 */

export interface Question {
  question: string;
  options: string[];
  answer: number;
}

const db_easy: Question[] = [
  {
    question: '¿Qué indica la luz roja de un semáforo?',
    options: ['Que se puede avanzar', 'Que hay que detenerse', 'Que se puede girar a la izquierda', 'Que la vía está libre'],
    answer: 1,
  },
  {
    question: '¿Qué significa un triángulo con borde rojo en la calzada?',
    options: ['Que hay un puesto de venta en el lugar', 'Que la calle es de doble sentido', 'Que hay que estar atento a un peligro', 'Que termina la zona donde se permite el tránsito de vehículos'],
    answer: 2,
  },
  {
    question: '¿Por qué se usa el cinturón de seguridad?',
    options: ['Sólo para no molestar a los pasajeros', 'Porque frena el auto antes de un choque', 'Porque lo exige el seguro del auto', 'Para evitar salir despedido tras un choque'],
    answer: 3,
  },
  {
    question: '¿Por qué está prohibido usar el celular mientras se conduce?',
    options: ['Porque consume batería', 'Porque se rompe el parabrisas', 'Porque todo conductor tiene un límite legal de mensajes', 'Porque distrae y aumenta el tiempo de reacción'],
    answer: 3,
  },
  {
    question: '¿Quién debe usar casco en un vehículo de dos ruedas?',
    options: ['Todos los ocupantes', 'Sólo quien conduce', 'Sólo los menores de 18 años', 'Sólo cuando llueve'],
    answer: 0,
  },
  {
    question: '¿Por dónde se cruza la calzada a pie?',
    options: ['Por la senda peatonal o, si no hay, por las esquinas', 'Por la mitad, donde se ve mejor', 'Por la esquina más cercana', 'Sólo cuando el semáforo está en rojo'],
    answer: 0,
  },
  {
    question: 'Tienes luz verde, pero hay una persona cruzando la calle. ¿Qué haces?',
    options: ['Tocas la bocina y sigues', 'Frenas y esperas a que termine de cruzar', 'Pasas rápido para no demorar', 'Giras a la izquierda sin mirar'],
    answer: 1,
  },
  {
    question: '¿Qué conviene hacer con el auto que va adelante en el mismo carril?',
    options: ['Pegarse a su parachoques para no perderlo de vista', 'Adelantarlo por la derecha', 'Pasar al carril izquierdo y seguir pegado', 'Mantener una distancia prudente'],
    answer: 3,
  },
  {
    question: '¿Qué significa una línea continua pintada sobre la calzada?',
    options: ['Que se puede cambiar de carril con señalización', 'Que la vía termina en ese punto', 'Que no se puede sobrepasar ni cambiar de carril', 'Que es un carril exclusivo para colectivos'],
    answer: 2,
  },
  {
    question: '¿Qué hay que hacer al acercarse a una curva sin visibilidad?',
    options: ['Mantener la velocidad para no perder tiempo', 'Desacelerar antes de entrar', 'Tocar la bocina y acelerar', 'Cerrar las ventanas del vehículo'],
    answer: 1,
  },
  {
    question: '¿Qué significa la señalización de \'no estacionar\' en la calzada?',
    options: ['Se puede estacionar por un rato corto', 'Está prohibido estacionar en ese lugar', 'Sólo se puede estacionar de noche', 'Se puede estacionar pagando un importe'],
    answer: 1,
  },
  {
    question: 'Antes de girar, ¿qué es correcto hacer?',
    options: ['Girar rápido sin mirar', 'Tocar la bocina y girar', 'Girar sólo si nadie te está mirando', 'Mirar por el espejo, poner la luz de giro y reducir la velocidad'],
    answer: 3,
  },
  {
    question: '¿Cómo se debe sobrepasar una bicicleta?',
    options: ['Pasando lo más cerca posible para no demorar', 'Tocando la bocina para avisar', 'Por la izquierda, dejando distancia lateral', 'Por la derecha, pegado al cordón'],
    answer: 2,
  },
  {
    question: '¿Para qué sirven las luces de giro?',
    options: ['Para iluminar más el camino', 'Para avisar con antelación la maniobra que se va a hacer', 'Para indicar la velocidad del auto', 'Para distinguir a un vehículo averiado'],
    answer: 1,
  },
  {
    question: '¿Qué conviene hacer cuando llueve?',
    options: ['Circular más rápido para no perder tiempo', 'Reducir la velocidad y aumentar la distancia de seguridad', 'Conducir con las luces largas encendidas', 'Frenar sólo cuando se vea el obstáculo'],
    answer: 1,
  },
  {
    question: '¿Qué hay que hacer si se levanta niebla en la ruta?',
    options: ['Reducir la velocidad y no usar las luces largas', 'Usar las luces largas a máxima potencia', 'Detenerse en el mismo carril', 'Aumentar la velocidad para avanzar antes de que se corte'],
    answer: 0,
  },
  {
    question: '¿Qué se hace si aparece un animal suelto en la calzada?',
    options: ['Disminuir la velocidad, detenerse si hace falta y avisar a las autoridades', 'Tocar la bocina para espantarlo', 'Seguir a la misma velocidad', 'Girar bruscamente hacia el otro lado'],
    answer: 0,
  },
  {
    question: '¿Por qué es peligroso conducir con sueño?',
    options: ['Porque el auto consume más combustible', 'Porque se pierde capacidad de reacción y atención', 'Porque se recalienta el motor', 'Porque el seguro no cubre ese riesgo'],
    answer: 1,
  },
  {
    question: '¿Qué conviene hacer antes de arrancar un viaje largo?',
    options: ['Dormir lo suficiente la noche anterior', 'Tomar café bien caliente antes de salir', 'Conducir de noche cuando hay menos tránsito', 'Revisar sólo la apariencia exterior del auto'],
    answer: 0,
  },
  {
    question: 'El semáforo cambia a amarillo mientras sigues detenido en la esquina. ¿Qué haces?',
    options: ['Arrancas rápido para pasar antes de que cambie', 'Giras a la izquierda sin esperar', 'Esperas a que cambie a verde', 'Cruzas igual porque la luz ya estaba verde'],
    answer: 2,
  },
  {
    question: '¿Qué aviso da un vehículo con las balizas rojas intermitentes encendidas?',
    options: ['Que está circulando despacio por un tramo de riesgo', 'Que es un vehículo de transporte escolar', 'Que se acerca un vehículo de emergencia', 'Que está detenido o averiado'],
    answer: 3,
  },
  {
    question: '¿Cuál es la edad mínima para obtener la licencia de conducir un automóvil?',
    options: ['14 años', '15 años', '16 años', '17 años'],
    answer: 3,
  },
  {
    question: '¿Hasta qué condición se exige usar un sistema de sujeción para niños?',
    options: ['Hasta cumplir 6 años', 'Sólo hasta los 3 años', 'Hasta los 12 años, o menos de 1,50 m de estatura, o menos de 36 kg', 'Sólo cuando el niño viaja en el asiento delantero'],
    answer: 2,
  },
  {
    question: '¿El airbag reemplaza al cinturón de seguridad?',
    options: ['Sí, porque es más eficaz', 'Sí, si el auto es nuevo', 'No, porque nunca se despliega', 'No: complementa al cinturón y no lo reemplaza'],
    answer: 3,
  },
  {
    question: '¿Para qué se usan las luces largas durante la noche?',
    options: ['Para ver mejor cuando no hay tránsito cerca', 'Como señal de emergencia', 'Para avisar que se va a dar la vuelta', 'Para llamar la atención en un estacionamiento'],
    answer: 0,
  },
  {
    question: '¿Por qué conviene mantener distancia de los autos estacionados?',
    options: ['Porque ocupan lugar', 'Porque pueden tener la alarma encendida', 'Porque una puerta puede abrirse de golpe', 'Porque están más fríos que los demás'],
    answer: 2,
  },
  {
    question: 'En una rotonda, ¿quién tiene la prioridad?',
    options: ['El vehículo que ya está circulando dentro de la rotonda', 'El vehículo que va a entrar', 'El que llega más rápido', 'Siempre el que viene por la derecha'],
    answer: 0,
  },
  {
    question: 'Una persona cruza por la mitad de la calle sin respetar la senda. ¿Qué corresponde?',
    options: ['Nada: la ley sólo obliga a la persona que cruza', 'Esa persona es la única responsable del incidente', 'Frenar y priorizar su integridad física', 'Llamar a la policía de inmediato'],
    answer: 2,
  },
  {
    question: '¿Por qué no se debe pasar muy pegado a una bicicleta?',
    options: ['Porque quien la conduce podría superar el límite de velocidad', 'Porque molesta a quien está en la bicicleta', 'Porque un contacto mínimo puede hacer que la bicicleta pierda equilibrio y caiga', 'Porque ocupa el mismo espacio que un automóvil'],
    answer: 2,
  },
  {
    question: '¿Qué conviene hacer al descender del vehículo a la calzada?',
    options: ['Abrir la puerta de golpe para salir más rápido', 'Encender las balizas y usar el chaleco reflectivo en vías rápidas', 'Caminar por el medio del carril', 'Esperar a que pase otro auto por la puerta abierta'],
    answer: 1,
  },
];

export default db_easy;
