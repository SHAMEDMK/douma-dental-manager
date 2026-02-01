'use client'

import { useState } from 'react'
import ReassignDeliveryAgentModal from '../ReassignDeliveryAgentModal'

type ReassignDeliveryAgentButtonProps = {
  orderId: string
  orderNumber: string
  currentAgentName: string
}

export default function ReassignDeliveryAgentButton({
  orderId,
  orderNumber,
  currentAgentName
}: ReassignDeliveryAgentButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="text-xs text-blue-600 hover:text-blue-800 underline"
        title="Réassigner à un autre livreur"
      >
        Réassigner
      </button>
      <ReassignDeliveryAgentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        orderId={orderId}
        orderNumber={orderNumber}
        currentAgentName={currentAgentName}
      />
    </>
  )
}
