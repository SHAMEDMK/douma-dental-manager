'use server'

import { acceptInvitation } from '@/app/actions/invitation'

export async function acceptInvitationAction(token: string, passwordRaw: string) {
    return await acceptInvitation(token, passwordRaw)
}
