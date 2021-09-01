# OpenAPI Request Security

Secure a request using OpenAPI security definitions.

## Install

The usual way:

```shell
npm install openapi-request-security
```

## Using

Create an instance, passing in an [OpenAPI 3.0+ Document](https://swagger.io/specification/)
and a map of [Security Requirement](https://swagger.io/specification/#security-requirement-object)
names to callable functions.

Something like this:

```js
import { openapiRequestSecurity } from 'openapi-request-security'

const secure = openapiRequestSecurity({
	definition: { // OpenAPI Document
	    paths: {
	        '/pets/{petId}': {
	            get: {
	                security: [
						{ api_key: [] }
					]
				}
			}
		}
	},
	securities: { // Map<String, AsyncFunction>
	    api_key: async ({ request, scopes }) => {
	        if (!request.headers.authentication.includes('battery-horse-staple')) {
	            // To cause a failure, the function needs to throw.
	            throw new Error('API token did not have super secret password!')
			}
		}
	}
})
```

When securing a request, you'll then need to pass in a request object and the OpenAPI
path to use:

```js
async function handleRequest(request) {
    try {
        await secure({request, path: '/pets/{petId}'})
    } catch (error) {
        if (error.name === 'RequestNotSecured') {
            // the request did not pass any of the Security Requirement definitions
		}
	}
}
```

## Securing Function

The securing function must be an `async` function, and is called with an object containing
the following properties:

* `definition: Object` - The OpenAPI Document passed in during instantiation.
* `request: Object` - The request object passed in when run.
* `path: String` - The OpenAPI path string passed in when run.
* `scopes: Array` - The array of scopes on the Security Requirement object, e.g. `['read:pets']`.

The function is considered to be passing if it does not throw an error.

In other words, to fail the security check, throw an error.

## Order of Operations

Following the OpenAPI specs, the Security Requirement objects are evaluated first
to last: any object that does not throw an error will cause the function to exit
and the request will be considered secured.

A Security Requirement object can have multiple properties, such as:

```json
{
	"oauth": [ "read:pets" ],
	"other_requirement": []
}
```

In this case, every requirement in that object must pass for the overall object
to be considered passing.

> **Note:** the keys for an object are evaluated using `Object.keys` ordering, which
> may not be deterministic, depending on your environment.

Consider an example Security Requirement list:

```js
const security = [
	{
	    thing1: []
	},
	{
	    thing2: [],
		thing3: []
	},
]
```

In this example, the `thing1` function would be called first. If calling that function
did not throw an error, it would be considered a pass, and the other `thing2` and `thing3`
functions would **not** execute.

However, if the `thing1` function threw an error, the next object would be evaluated,
which means `thing2` and `thing3` would be executed. (Again, depending on your environment
the order of execution may not be deterministic.)

If both `thing2` and `thing3` did not throw an error, the second object would be considered
a pass, and no further execution would occur.

However, if *either* `thing2` or `thing3` threw an error, in this case the request would
be considered not secured, and an error would be thrown.

## Thrown Errors

The following named errors may be thrown:

### `OperationNotFound`

Thrown when the instantiated security function is called, if the request does not match
any Operation Object in the OpenAPI document.

### `SecuringFunctionNotFound`

Thrown when the instantiated security function is called, if there is a Security Requirement
in the OpenAPI documents Operation Object, but a matching named function is not found on
the `securities` map provided during instantiation.

### `RequestNotSecured`

Thrown when the instantiated security function is called, if there are any thrown errors
when calling the securing functions. This is the normal error thrown if a Operation Object
has a Security Requirement but the request is not correctly authenticated, e.g. the request
needed an API token but there wasn't a valid one.

Additionally, the `RequestNotSecured` error includes an `errors` property, which contains
a list of objects with the following properties:

- `name: String` - the name of the Security Requirement, e.g. `thing1` from the earlier example.
- `error: Error` - the error thrown when calling the securing function.

## License

This software and all included resources are published and released under the
[Very Open License](http://veryopenlicense.com).
