



export const getBoolean = (value: unknown, name: string): boolean => {

    if (value === undefined || value === null) {
        console.warn(`⚠️  Failed to update box ${name} for RefundPermitChanged: permission is undefined or null`)
        return false
    }

    // Handle boolean value (could be boolean, number, string)
    let permission: boolean
    if (typeof value === 'boolean') {
        permission = value
    } else if (typeof value === 'number') {
        permission = value !== 0
    } else {
        const permissionStr = String(value).toLowerCase()
        permission = permissionStr === 'true' || permissionStr === '1'
    }

    return permission
}