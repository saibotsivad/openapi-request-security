import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { openapiRequestSecurity } from './index.js'

const catchify = p => p.then(o => ([ false, o ]), e => ([ e ]))

test('when there are no security requirements', async () => {
	const secure = openapiRequestSecurity({
		definition: {
			paths: {
				'/pets': {
					get: {}
				}
			}
		},
		securities: {}
	})
	const request = { method: 'GET' }
	const [ error, out ] = await catchify(secure({ request, path: '/pets'}))
	assert.not.ok(error, 'there should not be an error')
	assert.equal(request, out, 'it passes out the request object')
})

test('when the operation cannot be found', async () => {
	const secure = openapiRequestSecurity({
		definition: {
			paths: {
				'/pets': {
					get: {}
				}
			}
		},
		securities: {}
	})
	const request = { method: 'PATCH' }
	const [ error, out ] = await catchify(secure({ request, path: '/pets'}))
	assert.not.ok(out, 'it should not succeed')
	assert.equal(error.name, 'OperationNotFound', 'the correct error is thrown')
})

test('when there is a security requirement but no function', async () => {
	const secure = openapiRequestSecurity({
		definition: {
			paths: {
				'/pets': {
					get: {
						security: [{ thing: [] }]
					}
				}
			}
		},
		securities: {}
	})
	const request = { method: 'GET' }
	const [ error, out ] = await catchify(secure({ request, path: '/pets'}))
	assert.not.ok(out, 'it should not succeed')
	assert.equal(error.name, 'SecuringFunctionNotFound', 'the correct error is thrown')
})

const definition = {
	paths: {
		'/pets': {
			get: {
				security: [
					{
						thing1: [ 'scope1' ]
					},
					{
						thing2: [ 'scope2' ],
						thing3: [ 'scope3' ]
					}
				]
			}
		}
	}
}

const wrapper = handler => async props => {
	try {
		await handler(props)
	} catch (error) {
		console.error(error)
		process.exit(1)
	}
}

test('when the first security requirement passes', async () => {
	let calls = 0
	const request = { method: 'GET' }
	const secure = openapiRequestSecurity({
		definition,
		securities: {
			thing1: wrapper(props => {
				calls++
				assert.ok(props.request === request, 'gets called with the request')
				assert.equal(props.path, '/pets', 'and the correct path')
			})
		}
	})
	await secure({ request, path: '/pets'})
	assert.equal(calls, 1, 'it calls functions the right number of times')
})

test('when all the security requirements fail', async () => {
	let calls = 0
	const secure = openapiRequestSecurity({
		definition,
		securities: {
			thing1: async () => {
				calls++
				throw new Error('oops1')
			},
			thing2: async () => {
				calls++
				throw new Error('oops2')
			},
			thing3: async () => {
				calls++
				throw new Error('oops3')
			},
		}
	})
	const [ error ] = await catchify(secure({ request: { method: 'GET' }, path: '/pets'}))
	assert.equal(error.name, 'RequestNotSecured', 'it gets the correct error')
	assert.equal(calls, 3, 'it calls all three secure functions')
	assert.equal(error.errors.length, 3, 'it has three errors in it')
	assert.ok(error.errors.find(({ error }) => error.message === 'oops1'), 'has the first error')
	assert.ok(error.errors.find(({ error }) => error.message === 'oops2'), 'has the second error')
	assert.ok(error.errors.find(({ error }) => error.message === 'oops3'), 'has the third error')
})

test.run()
