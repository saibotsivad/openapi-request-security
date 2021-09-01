const logRoute = (request, path) => request.method + ' ' + path

export class OperationNotFound extends Error {
	constructor(request, path) {
		super(`Could not find operation for request: ${logRoute(request, path)}`)
		this.name = 'OperationNotFound'
	}
}

export class SecuringFunctionNotFound extends Error {
	constructor(request, path, name) {
		const message = `Could not find "securities" function for "${name}": ${logRoute(request, path)}`
		super(message)
		this.message = message
		this.name = 'SecuringFunctionNotFound'
	}
}

export class RequestNotSecured extends Error {
	constructor(request, path, errors) {
		const message = `Could not authenticate request: ${logRoute(request, path)}`
		super(message)
		this.message = message
		this.name = 'RequestNotSecured'
		this.errors = errors
	}
}

export const openapiRequestSecurity = ({ definition, securities }) => async ({ request, path }) => {
	const operation = definition?.paths[path]?.[request.method.toLowerCase()]
	if (!operation) throw new OperationNotFound(request, path)

	const errors = []
	for (const securityRequirement of (operation.security || [])) {
		let successfulSectionCount = 0
		for (const name of Object.keys(securityRequirement)) {
			if (typeof securities[name] !== 'function') throw new SecuringFunctionNotFound(request, path, name)
			try {
				await securities[name]({ definition, request, path, scopes: securityRequirement[name] })
				successfulSectionCount++
			} catch (error) {
				errors.push({ name, error })
			}
		}
		if (successfulSectionCount === Object.keys(securityRequirement).length) {
			return request
		}
	}
	if (errors.length) {
		throw new RequestNotSecured(request, path, errors)
	}
	return request
}
