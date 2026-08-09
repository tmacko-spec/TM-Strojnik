
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './Layout'
import Dashboard from './Dashboard'
import MachineForm from './MachineForm'
import MachineDetail from './MachineDetail'
import ShiftStart from './ShiftStart'
import Shifts from './Shifts'
import Settings from './Settings'
import Planner from './Planner'
import { FuelForm, ServiceForm, FaultForm } from './SimpleEntry'
import { OcrMeter, OcrReceipt } from './OCR'
import Survey from './Survey'
import SurveyStart from './SurveyStart'
import SurveyMeasure from './SurveyMeasure'

export default function App() {
  return (
    <BrowserRouter basename="/TM-Strojnik">
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/machines/new" element={<MachineForm />} />
          <Route path="/machines/:id/edit" element={<MachineForm />} />
          <Route path="/machine/:id" element={<MachineDetail />} />
          <Route path="/machine/:id/fuel" element={<FuelForm />} />
          <Route path="/machine/:id/service" element={<ServiceForm />} />
          <Route path="/machine/:id/fault" element={<FaultForm />} />
          <Route path="/shift/start/:machineId" element={<ShiftStart />} />
          <Route path="/shifts" element={<Shifts />} />
          <Route path="/ocr/meter" element={<OcrMeter />} />
          <Route path="/ocr/receipt" element={<OcrReceipt />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/survey" element={<Survey />} />
          <Route path="/survey/new" element={<SurveyStart />} />
          <Route path="/survey/measure" element={<SurveyMeasure />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
