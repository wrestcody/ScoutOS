import { useState } from 'react'
import './App.css'

function App() {
  const [url, setUrl] = useState('https://api.github.com/users/octocat')
  const [method, setMethod] = useState('GET')
  const [headers, setHeaders] = useState('{}')
  const [body, setBody] = useState('{}')
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleRequest = async () => {
    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      const parsedHeaders = JSON.parse(headers)
      const parsedBody = method !== 'GET' ? JSON.parse(body) : null

      const res = await fetch('http://localhost:8000/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method,
          url,
          headers: parsedHeaders,
          data: parsedBody,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || 'An error occurred')
      }

      setResponse(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h1>scoutos Collector Workbench</h1>
      <div className="card">
        <h2>Request Panel</h2>
        <div className="request-form">
          <label>URL:</label>
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} />
          <label>Method:</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
          <label>Headers (JSON):</label>
          <textarea value={headers} onChange={(e) => setHeaders(e.target.value)} />
          <label>Body (JSON - for POST/PUT):</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} disabled={method === 'GET'} />
          <button onClick={handleRequest} disabled={loading}>
            {loading ? 'Loading...' : 'Send Request'}
          </button>
        </div>
      </div>
      <div className="card">
        <h2>Response</h2>
        {error && <pre className="error">Error: {error}</pre>}
        <pre>{response ? JSON.stringify(response, null, 2) : "Make a request to see the response"}</pre>
      </div>
    </>
  )
}

export default App