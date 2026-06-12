import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ReducedMotionProvider } from './context/ReducedMotionContext'
import { Landing } from './routes/landing/landingIndex'
import { SiteLayout } from './routes/layout/siteLayoutIndex'
import { Home } from './routes/home/homeIndex'
import { About } from './routes/about/aboutIndex'
import { Rants } from './routes/rants/rantsIndex'
import { Things } from './routes/things/thingsIndex'
import { Stuff } from './routes/stuff/stuffIndex'
import { Contact } from './routes/contact/contactIndex'

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  {
    element: <SiteLayout />,
    children: [
      { path: '/home', element: <Home /> },
      { path: '/about', element: <About /> },
      { path: '/rants', element: <Rants /> },
      { path: '/things', element: <Things /> },
      { path: '/stuff', element: <Stuff /> },
      { path: '/contact', element: <Contact /> },
    ],
  },
])

/**
 * @description Root app component. Sets up the browser router and wraps
 * everything in the reduced motion context provider.
 * @author Chris "Mo" Mochinski
 */
function App() {
  return (
    <ReducedMotionProvider>
      <RouterProvider router={router} />
    </ReducedMotionProvider>
  )
}

export default App
