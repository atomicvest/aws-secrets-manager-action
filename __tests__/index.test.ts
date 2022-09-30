import { getSecretValue, listSecrets, getSecretValueMap } from '../src/awsUtils'
import { SecretsManager } from 'aws-sdk'
import { resolve } from "path"
import { config } from "dotenv"

jest.mock('aws-sdk')

config({ path: resolve(__dirname, "../.env") })

const secretsManagerClient = new SecretsManager({})

test('Fetch Secret Value: Valid Secret Name', () => {
  expect.assertions(2)
  return getSecretValue(secretsManagerClient, 'my_secret_1', ).then(secretValue => {
    expect(Object.keys(secretValue)).toContain('SecretString')
    expect(secretValue['SecretString']).toEqual('plain_text')
  })
})

test('Fetch Secret Value: Invalid Secret Name', () => {
  expect.assertions(1)
  return getSecretValue(secretsManagerClient, 'foobarbaz', ).catch(err => {
    expect(err).not.toBeNull()
  })
})


test('List Secrets', () => {
  expect.assertions(1)
  return listSecrets(secretsManagerClient).then(secretNames => {
    expect(secretNames.sort()).toEqual(['my_secret_1', 'my_secret_2', 'my/secret/3'].sort())
  })
})

test('Get Secret Value Map: not JSON value', () => {
  expect.assertions(1)
  return getSecretValueMap(secretsManagerClient, 'my_secret_1').catch(err => {
    expect(err).not.toBeNull()
  })
})

test('Get Secret Value Map: JSON string value', () => {
  expect.assertions(1)
  return getSecretValueMap(secretsManagerClient, 'my_secret_2').then(secretValueMap => {
    expect(secretValueMap).toMatchObject({ 'foo': 'bar' })
  })
})

