import * as core from '@actions/core'
import { Inputs } from './constants'

/* Validate a possible object i.e., o = { "a": 2 } */
export const isJSONObject = (o: Record<string, any>): boolean =>
  !!o && (typeof o === 'object') && !Array.isArray(o) &&
  ((): boolean => { try { return Boolean(JSON.stringify(o)) } catch { return false } })()

/* Validate a possible JSON object represented as string i.e., s = '{ "a": 3 }' */
export const isJSONObjectString = (s: string): boolean => {
  try {
    const o = JSON.parse(s)
    return !!o && (typeof o === 'object') && !Array.isArray(o)
  } catch {
    return false
  }
}

export const getPOSIXString = (data: string): string => {
  if (data.match(/^[0-9]/))
    data = '_'.concat(data)
  return data.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase()
}

export const injectSecretValueMapToEnvironment = (secretValueMap: Record<string, any>): void => {
  const disableWarnings = core.getBooleanInput(Inputs.DISABLE_WARNINGS)

  for (const secretName in secretValueMap) {
    const secretValue: string = secretValueMap[secretName]
    core.setSecret(secretValue)
    // If secretName contains non-posix characters, it can't be read by the shell
    // Get POSIX compliant name secondary env name that can be read by the shell
    const secretNamePOSIX = getPOSIXString(secretName)
    if (secretName !== secretNamePOSIX && !disableWarnings) {
      core.warning('One of the secrets has a name that is not POSIX compliant and hence cannot directly \
be used/injected as an environment variable name. Therefore, it will be transformed into a POSIX compliant \
environment variable name. Enable GitHub Actions Debug Logging \
(https://docs.github.com/en/free-pro-team@latest/actions/managing-workflow-runs/enabling-debug-logging) to \
see the transformed environment variable name.\nPOSIX compliance: environment variable names can only contain \
upper case letters, digits and underscores. It cannot begin with a digit.')
      core.debug(`Secret name '${secretName}' is not POSIX compliant. It will be transformed to '${secretNamePOSIX}'.`)
    }
    core.debug(`Injecting environment variable '${secretNamePOSIX}'.`)
    core.exportVariable(secretNamePOSIX, secretValue)
  }
}
