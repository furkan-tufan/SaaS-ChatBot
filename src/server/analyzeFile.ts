import { config } from 'wasp/client'

const response = await fetch(
  `${config.apiUrl}/analyze`, 
  { method: "POST", body: formData }
)