import { useState } from 'react'
import './App.css'

const services = [
  {
    name: 'Alisado Motaplex',
    description: 'Lacio brillante, disciplinado y con tecnologia de reparacion.',
    price: '$52.000',
    accent: 'bg-[#f4f0ff] text-[#6f55c8]',
  },
  {
    name: 'Botox',
    description: 'Tratamiento intensivo para suavidad, cuerpo y control del frizz.',
    price: '$38.000',
    accent: 'bg-[#faf8ff] text-[#7d63dd]',
  },
  {
    name: 'Shock de Keratina',
    description: 'Sellado nutritivo para recuperar brillo y movimiento natural.',
    price: '$35.000',
    accent: 'bg-[#f1ecff] text-[#5e46bb]',
  },
  {
    name: 'Biotina',
    description: 'Fortalecimiento capilar para un pelo mas resistente y luminoso.',
    price: '$29.000',
    accent: 'bg-stone-100 text-stone-800',
  },
]

const timeSlots = [
  { label: '10:00 hs', detail: 'Manana' },
  { label: '13:00 hs', detail: 'Mediodia' },
  { label: '16:00 hs', detail: 'Ultimo turno' },
]

function App() {
  const [selectedService, setSelectedService] = useState(services[0].name)
  const [selectedTime, setSelectedTime] = useState(timeSlots[0].label)
  const [date, setDate] = useState('')
  const [dateError, setDateError] = useState('')

  const handleDateChange = (event) => {
    const value = event.target.value
    const selectedDate = value ? new Date(`${value}T12:00:00`) : null
    const isSunday = selectedDate?.getDay() === 0

    setDate(value)
    setDateError(
      isSunday ? 'Los domingos no hay atencion. Elegi de lunes a sabado.' : '',
    )
  }

  return (
    <main className="min-h-screen bg-white text-stone-900">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-[#ded4ff] pb-5">
          <a
            href="#reserva"
            className="flex items-center gap-3 text-xl font-semibold tracking-wide text-stone-950 sm:text-2xl"
          >
            <img
              src="/logo-ma.jpeg"
              alt="MA"
              className="h-14 w-14 rounded-full border-2 border-[#ad91f6] object-cover shadow-sm shadow-[#ad91f6]/25"
            />
            <span>Maca Alisados</span>
          </a>
          <a
            href="#reserva"
            className="rounded-full bg-[#8b6fe8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#ad91f6]/30 transition hover:bg-[#7458d6]"
          >
            Reservar turno
          </a>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
          <section className="space-y-8">
            <div className="max-w-3xl space-y-5">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#8b6fe8]">
                Turnos de lunes a sabado
              </p>
              <h1 className="text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl lg:text-6xl">
                Reserva tu tratamiento capilar en tres pasos.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
                Elegi el servicio, selecciona una fecha disponible y confirma
                uno de los tres horarios fijos del dia.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {services.map((service) => {
                const isSelected = selectedService === service.name

                return (
                  <button
                    key={service.name}
                    type="button"
                    onClick={() => setSelectedService(service.name)}
                    className={`rounded-lg border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                      isSelected
                        ? 'border-[#8b6fe8] ring-4 ring-[#f1ecff]'
                        : 'border-[#ded4ff]'
                    }`}
                  >
                    <div className="flex h-full flex-col justify-between gap-5">
                      <div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${service.accent}`}
                        >
                          Servicio
                        </span>
                        <h2 className="mt-4 text-xl font-semibold text-stone-950">
                          {service.name}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-stone-600">
                          {service.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-2xl font-semibold text-[#7d63dd]">
                          {service.price}
                        </p>
                        <span
                          className={`h-4 w-4 rounded-full border-2 ${
                            isSelected
                              ? 'border-[#8b6fe8] bg-[#8b6fe8]'
                              : 'border-stone-300 bg-white'
                          }`}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section
            id="reserva"
            className="grid gap-5 rounded-lg border border-[#ded4ff] bg-white p-5 shadow-xl shadow-[#ad91f6]/10 sm:p-6"
          >
            <div className="rounded-lg border border-[#ded4ff] bg-[#faf8ff] p-5">
              <h2 className="text-2xl font-semibold text-stone-950">
                Confirmar reserva
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Atendemos de lunes a sabado en turnos fijos de 10:00, 13:00 y
                16:00 hs.
              </p>
            </div>

            <form className="grid gap-4">
              <div className="rounded-lg border border-[#ded4ff] bg-[#faf8ff] p-4">
                <p className="text-sm font-semibold text-stone-700">
                  Servicio seleccionado
                </p>
                <p className="mt-1 text-lg font-semibold text-[#6f55c8]">
                  {selectedService}
                </p>
              </div>

              <label className="grid gap-2 text-sm font-semibold text-stone-700">
                Fecha
                <input
                  type="date"
                  name="date"
                  value={date}
                  onChange={handleDateChange}
                  className={`h-12 rounded-md border bg-white px-4 text-base font-medium text-stone-900 outline-none transition focus:ring-4 ${
                    dateError
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
                      : 'border-stone-200 focus:border-[#8b6fe8] focus:ring-[#f1ecff]'
                  }`}
                />
                {dateError ? (
                  <span className="text-sm font-medium text-red-600">
                    {dateError}
                  </span>
                ) : (
                  <span className="text-sm font-medium text-stone-500">
                    Domingos no disponibles.
                  </span>
                )}
              </label>

              <fieldset className="grid gap-3">
                <legend className="text-sm font-semibold text-stone-700">
                  Horario
                </legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {timeSlots.map((slot) => {
                    const isSelected = selectedTime === slot.label

                    return (
                      <button
                        key={slot.label}
                        type="button"
                        onClick={() => setSelectedTime(slot.label)}
                        className={`min-h-24 rounded-lg border-2 px-4 py-3 text-center transition ${
                          isSelected
                            ? 'border-[#8b6fe8] bg-[#8b6fe8] text-white shadow-md shadow-[#ad91f6]/30'
                            : 'border-stone-200 bg-white text-stone-800 hover:border-[#ad91f6] hover:bg-[#faf8ff]'
                        }`}
                      >
                        <span className="block text-xl font-semibold">
                          {slot.label}
                        </span>
                        <span
                          className={`mt-1 block text-sm font-medium ${
                            isSelected ? 'text-[#f4f0ff]' : 'text-stone-500'
                          }`}
                        >
                          {slot.detail}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-stone-700">
                  Nombre
                  <input
                    type="text"
                    name="name"
                    placeholder="Tu nombre"
                    className="h-12 rounded-md border border-stone-200 bg-white px-4 text-base font-medium text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[#8b6fe8] focus:ring-4 focus:ring-[#f1ecff]"
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-stone-700">
                  Telefono
                  <input
                    type="tel"
                    name="phone"
                    placeholder="11 5555 5555"
                    className="h-12 rounded-md border border-stone-200 bg-white px-4 text-base font-medium text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[#8b6fe8] focus:ring-4 focus:ring-[#f1ecff]"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={Boolean(dateError)}
                className="mt-2 h-14 rounded-md bg-[#8b6fe8] px-5 text-base font-semibold text-white shadow-sm shadow-[#ad91f6]/30 transition hover:bg-[#7458d6] focus:outline-none focus:ring-4 focus:ring-[#f1ecff] disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
              >
                Confirmar Turno
              </button>
            </form>
          </section>
        </div>

        <section className="pb-10">
          <div className="rounded-lg border border-[#ded4ff] bg-white p-5 shadow-lg shadow-[#ad91f6]/10 sm:p-6">
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#8b6fe8]">
                Ubicacion
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-950">
                📍 Av. 25 de Mayo 1522, Lanús Oeste
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                Buenos Aires, Argentina
              </p>
            </div>

            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3279.7909282367503!2d-58.416025124255154!3d-34.70472767291884!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bcccbc46a45aa9%3A0x7191f2484b27ab48!2sAv.%2025%20de%20Mayo%201522%2C%20B1824%20Lan%C3%BAs%2C%20Provincia%20de%20Buenos%20Aires!5e0!3m2!1ses-419!2sar!4v1716238000000!5m2!1ses-419!2sar"
              className="w-full h-64 md:h-80 rounded-xl shadow-md border-0"
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </section>
      </section>
    </main>
  )
}

export default App
