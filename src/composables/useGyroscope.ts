type PermissionFn = () => Promise<'granted' | 'denied' | 'default'>

export type SensorStatus = 'granted' | 'denied' | 'unsupported' | 'insecure'

export function needsIOSPermission(): boolean {
  return typeof DeviceOrientationEvent !== 'undefined' &&
    typeof (DeviceOrientationEvent as unknown as { requestPermission?: PermissionFn }).requestPermission === 'function'
}

/**
 * DEVE ser chamado de forma síncrona dentro de um handler de clique/toque.
 * No iOS, `requestPermission()` só funciona com gesto explícito do usuário.
 */
export function requestOrientationPermission(): Promise<SensorStatus> {
  if (typeof window === 'undefined') return Promise.resolve('unsupported')
  if (window.isSecureContext === false) return Promise.resolve('insecure')
  if (!('DeviceOrientationEvent' in window)) return Promise.resolve('unsupported')
  if (needsIOSPermission()) {
    const DOE = DeviceOrientationEvent as unknown as { requestPermission: PermissionFn }
    // Chamada síncrona: ainda dentro do gesto do usuário.
    const pending = DOE.requestPermission.call(DeviceOrientationEvent)
    return pending.then((r): SensorStatus => {
      if (r !== 'granted') return 'denied'
      // O GyroscopePlugin (e o DeviceOrientationControls interno) chamam requestPermission()
      // de novo, de forma assíncrona e fora do gesto: no iOS isso falha com NotAllowedError
      // e os listeners nunca são registrados. Como já temos a permissão, devolvemos o
      // resultado em cache para essas chamadas.
      DOE.requestPermission = () => Promise.resolve('granted')
      return 'granted'
    }).catch((): SensorStatus => 'denied')
  }
  return Promise.resolve('granted')
}

/** Verifica se o sensor envia dados reais (desktops expõem a API mas não emitem valores). */
export function probeOrientation(timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false
    const finish = (v: boolean) => {
      if (done) return
      done = true
      window.removeEventListener('deviceorientation', onEvt)
      resolve(v)
    }
    const onEvt = (e: DeviceOrientationEvent) => finish(e.alpha !== null && !Number.isNaN(e.alpha))
    window.addEventListener('deviceorientation', onEvt)
    setTimeout(() => finish(false), timeoutMs)
  })
}

export const SENSOR_MESSAGES: Record<Exclude<SensorStatus, 'granted'>, string> = {
  denied: 'Permissão de movimento negada. No iPhone, feche a aba e abra o site novamente para ser perguntado de novo, ou verifique Ajustes › Safari › Movimento e Orientação.',
  unsupported: 'Este dispositivo não possui sensor de orientação disponível. Continue navegando por toque ou mouse.',
  insecure: 'Os sensores de movimento exigem HTTPS. Abra o Sphere 360 por um endereço https:// para usar o giroscópio.',
}

export function useGyroscope() {
  return { needsIOSPermission, requestOrientationPermission, probeOrientation, SENSOR_MESSAGES }
}
