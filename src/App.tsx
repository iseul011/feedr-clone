import { Routes, Route } from 'react-router-dom'
import { Header, Footer } from './marketing/MarketingLayout'
import Landing from './marketing/Landing'
import Features from './marketing/Features'
import Pricing from './marketing/Pricing'
import PaymentSuccess from './marketing/PaymentSuccess'
import Privacy from './marketing/Privacy'
import Terms from './marketing/Terms'
import AuthPage from './auth/AuthPage'
import AuthGuard from './auth/AuthGuard'
import AppLayout from './app/AppLayout'
import ChannelsPage from './app/channels/ChannelsPage'
import ComposerPage from './app/composer/ComposerPage'
import QueuePage from './app/queue/QueuePage'
import CalendarPage from './app/calendar/CalendarPage'

export default function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/features" element={<Features />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="/app" element={<AuthGuard><AppLayout /></AuthGuard>}>
            <Route index element={<QueuePage />} />
            <Route path="composer" element={<ComposerPage />} />
            <Route path="queue" element={<QueuePage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="channels" element={<ChannelsPage />} />
          </Route>
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
