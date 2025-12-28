import Link from 'next/link'
import { ArrowRight, CheckCircle2, ShieldCheck, Truck, BarChart3 } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center text-white font-bold text-xl">D</div>
            <span className="text-2xl font-bold text-blue-900 tracking-tight">DOUMA<span className="text-blue-500">Dental</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-blue-900 font-medium">Fonctionnalités</a>
            <a href="#about" className="text-gray-600 hover:text-blue-900 font-medium">À propos</a>
            <a href="#contact" className="text-gray-600 hover:text-blue-900 font-medium">Contact</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="px-5 py-2.5 text-blue-900 font-semibold hover:bg-blue-50 rounded-full transition-colors"
            >
              Connexion
            </Link>
            <Link 
              href="/login" 
              className="px-5 py-2.5 bg-blue-900 text-white font-semibold rounded-full hover:bg-blue-800 transition-colors shadow-lg shadow-blue-900/20"
            >
              Espace Client
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-900 text-sm font-semibold mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Nouvelle plateforme disponible
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 mb-8 tracking-tight leading-tight">
              L'excellence dentaire, <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-900 to-blue-500">gérée intelligemment.</span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              La solution complète pour les professionnels dentaires. Commandez vos fournitures, suivez vos stocks et gérez vos factures en toute simplicité.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/login" 
                className="w-full sm:w-auto px-8 py-4 bg-blue-900 text-white font-bold rounded-full hover:bg-blue-800 transition-all transform hover:scale-105 shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2"
              >
                Accéder au portail
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                href="/login?role=admin" 
                className="w-full sm:w-auto px-8 py-4 bg-white text-blue-900 border-2 border-blue-100 font-bold rounded-full hover:border-blue-300 transition-colors flex items-center justify-center"
              >
                Administration
              </Link>
            </div>
          </div>
        </div>
        
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/4 w-[1000px] h-[1000px] bg-blue-100/50 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-1/2 -left-1/4 w-[800px] h-[800px] bg-cyan-50/50 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Tout ce dont vous avez besoin</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Une suite d'outils conçue pour optimiser votre flux de travail quotidien.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Truck className="w-8 h-8 text-blue-600" />}
              title="Gestion de Stock"
              description="Suivi en temps réel de vos stocks. Réservation automatique à la commande et alertes de seuil bas."
            />
            <FeatureCard 
              icon={<ShieldCheck className="w-8 h-8 text-blue-600" />}
              title="Commandes Sécurisées"
              description="Passez vos commandes en quelques clics. Paiement à la réception (COD) avec suivi précis."
            />
            <FeatureCard 
              icon={<BarChart3 className="w-8 h-8 text-blue-600" />}
              title="Facturation Simplifiée"
              description="Accédez à vos factures, devis et historique de paiements instantanément depuis votre espace."
            />
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Ils nous font confiance</h2>
          <div className="flex flex-wrap justify-center gap-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Logos placeholders */}
            <div className="text-2xl font-bold text-gray-400">DENTAL PRO</div>
            <div className="text-2xl font-bold text-gray-400">MEDICARE</div>
            <div className="text-2xl font-bold text-gray-400">ORTHO+</div>
            <div className="text-2xl font-bold text-gray-400">SMILE LAB</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold">D</div>
                <span className="text-xl font-bold">DOUMA Dental</span>
              </div>
              <p className="text-gray-400 max-w-sm">
                Partenaire de confiance pour les fournitures dentaires de haute qualité. Innovation, précision et service client d'excellence.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Liens Rapides</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/login" className="hover:text-white transition-colors">Espace Client</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Catalogue</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li>contact@douma-dental.com</li>
                <li>+33 1 23 45 67 89</li>
                <li>Paris, France</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} DOUMA Dental. Tous droits réservés.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="#" className="hover:text-white">Confidentialité</a>
              <a href="#" className="hover:text-white">CGV</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 bg-white rounded-2xl border border-gray-100 shadow-lg hover:shadow-xl transition-shadow group">
      <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
        <div className="group-hover:text-white text-blue-600 transition-colors">
          {icon}
        </div>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-500 leading-relaxed">
        {description}
      </p>
    </div>
  )
}
