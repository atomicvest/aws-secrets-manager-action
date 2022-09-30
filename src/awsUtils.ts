import * as core from '@actions/core'
import { AWSError, SecretsManager } from 'aws-sdk'
import { GetSecretValueResponse } from 'aws-sdk/clients/secretsmanager'
import { PromiseResult } from 'aws-sdk/lib/request'
import { isJSONObjectString, injectSecretValueMapToEnvironment } from './utils'

const getSecretsManagerClient = (config: Record<string, any>): SecretsManager => new SecretsManager(config)

const getSecretValue = (secretsManagerClient: SecretsManager, secretName: string, ):
  Promise<PromiseResult<GetSecretValueResponse, AWSError>> => {
  core.debug(`Fetching '${secretName}'`)
  return secretsManagerClient.getSecretValue({ SecretId: secretName}).promise()
}

const listSecretsPaginated = (secretsManagerClient, nextToken) =>
  secretsManagerClient.listSecrets({ NextToken: nextToken }).promise()

const listSecrets = (secretsManagerClient: SecretsManager): Promise<Array<string>> => {
  return new Promise<Array<string>>((resolve, reject) => {
    let nextToken: string = null
    const allSecretNames: string[] = []
    do {
      listSecretsPaginated(secretsManagerClient, nextToken)
        .then(res => {
          // fetch nextToken if it exists, reset to null otherwise
          if ('NextToken' in res) {
            nextToken = res['NextToken']
          } else {
            nextToken = null
          }
          // get all non-deleted secret names
          res['SecretList'].forEach(secret => {
            if (!('DeletedDate' in secret)) {
              allSecretNames.push(secret['Name'])
            }
          })
          resolve(allSecretNames)
        })
        .catch(err => {
          reject(err)
        })
    }
    while (nextToken)
  })
}

const getSecretValueMap = (secretsManagerClient: SecretsManager, secretName: string) => {
  return new Promise((resolve, reject) => {
    getSecretValue(secretsManagerClient, secretName)
      .then(data => {
        let secretValue
        // Decrypts secret using the associated KMS CMK.
        // Depending on whether the secret is a string or binary, one of these fields will be populated.
        if ('SecretString' in data) {
          secretValue = data['SecretString']
        } else {
          const buff = Buffer.from(data['SecretBinary'].toString(), 'base64')
          secretValue = buff.toString('ascii')
        }
        let secretValueMap = {}
        if (isJSONObjectString(secretValue)) {
          secretValueMap = JSON.parse(secretValue)
        } else {
          return reject('secret is not json')
        }
        resolve(secretValueMap)
      })
      .catch(err => {
        if ('code' in err) {
          if (err.code === 'DecryptionFailureException')
            // Secrets Manager can't decrypt the protected secret text using the provided KMS key.
            // Deal with the exception here, and/or rethrow at your discretion.
            return reject(err)
          else if (err.code === 'InternalServiceErrorException')
            // An error occurred on the server side.
            // Deal with the exception here, and/or rethrow at your discretion.
            return reject(err)
          else if (err.code === 'InvalidParameterException')
            // You provided an invalid value for a parameter.
            // Deal with the exception here, and/or rethrow at your discretion.
            return reject(err)
          else if (err.code === 'InvalidRequestException')
            // You provided a parameter value that is not valid for the current state of the resource.
            // Deal with the exception here, and/or rethrow at your discretion.
            return reject(err)
          else if (err.code === 'ResourceNotFoundException')
            // We can't find the resource that you asked for.
            // Deal with the exception here, and/or rethrow at your discretion.
            return reject(err)
          else if (err.code === 'AccessDeniedException')
            // We don't have access to the resource that you asked for.
            // Deal with the exception here, and/or rethrow at your discretion.
            return reject(err)
          else
            // Fetch failed due to an unrecognized error code
            return reject(err)
        }
        // Fetch failed for some other reason
        return reject(err)
      })
  })
}

const fetchAndInject = (secretsManagerClient: SecretsManager,
  secretName: string, envVars: string[]): void => {
  core.debug(`Will fetch secret: ${secretName}`)
  getSecretValueMap(secretsManagerClient, secretName)
    .then(map => {
      const filter = {}
      envVars.forEach((envVar) => {
        filter[envVar] = map[envVar]
      })
      injectSecretValueMapToEnvironment(filter)
    })
    .catch(err => {
      core.setFailed(`Failed to fetch '${secretName}'. Error: ${err}.`)
    })
}
export {
  getSecretsManagerClient,
  getSecretValue,
  listSecrets,
  getSecretValueMap,
  fetchAndInject
}
