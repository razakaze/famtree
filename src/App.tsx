import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import PersonList from './pages/PersonList'
import PersonView from './pages/PersonView'
import PersonEdit from './pages/PersonEdit'
import DataIO from './pages/DataIO'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<PersonList />} />
        <Route path="person/new" element={<PersonEdit />} />
        <Route path="person/:id" element={<PersonView />} />
        <Route path="person/:id/edit" element={<PersonEdit />} />
        <Route path="data" element={<DataIO />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
