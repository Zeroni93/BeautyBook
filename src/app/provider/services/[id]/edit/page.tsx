'use client'

import { useParams } from 'next/navigation'
import ServiceFormComponent from '../../ServiceForm'

export default function EditServicePage() {
  const params = useParams()
  const serviceId = params.id as string

  return <ServiceFormComponent mode="edit" serviceId={serviceId} />
}