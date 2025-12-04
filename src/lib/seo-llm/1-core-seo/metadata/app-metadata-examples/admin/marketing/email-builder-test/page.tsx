'use client'

export default function EmailBuilderTestPage() {
  console.log('TEST PAGE RENDERING')

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Email Builder Test Page</h1>
      <div className="bg-blue-100 p-4 rounded">
        <p>If you can see this, the page routing works.</p>
        <p>Check the console for "TEST PAGE RENDERING"</p>
      </div>
    </div>
  )
}
