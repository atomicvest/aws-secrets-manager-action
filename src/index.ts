import * as core from '@actions/core'

import { Inputs } from './constants'
import { getSecretsManagerClient, fetchAndInject } from './awsUtils'

const secretName: string = core.getInput(Inputs.SECRET_NAME, {required: true})
const secretVersion: string = core.getInput(Inputs.SECRET_VERSION, {required: true})
const envVars: string[] = [...new Set(core.getMultilineInput(Inputs.ENV_VARS, {required: true, trimWhitespace: true}))]


const AWSConfig = {}
const secretsManagerClient = getSecretsManagerClient(AWSConfig)

fetchAndInject(secretsManagerClient, secretName, secretVersion, envVars)

