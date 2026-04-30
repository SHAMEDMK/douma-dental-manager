import Link from 'next/link'
import { ArrowRight, ShoppingBag, FileText, MessageCircle } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-white border-b border-shamed-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl bg-shamed-navy"
              aria-hidden
            >
              S
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xl sm:text-2xl font-bold text-shamed-navy tracking-tight">SHAMED</span>
              <span className="text-[10px] sm:text-xs text-gray-500">Espace client</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="https://www.shamed.ma/#produits"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-shamed-copper font-medium transition-colors"
            >
              Services
            </a>
            <a
              href="https://www.shamed.ma/contact.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-shamed-copper font-medium transition-colors"
            >
              Contact
            </a>
          </nav>
          <div className="flex items-center">
            <Link
              href="/login"
              className="px-4 sm:px-5 py-2.5 bg-shamed-navy text-white font-semibold rounded-full hover:opacity-90 transition-opacity shadow-md border border-transparent hover:border-shamed-copper/40"
            >
              Espace client SHAMED
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden bg-gradient-to-b from-shamed-bg to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-shamed-navy/10 text-shamed-navy text-sm font-semibold mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-shamed-copper opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-shamed-copper" />
              </span>
              Réservé aux professionnels dentaires
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-shamed-ink mb-6 tracking-tight leading-tight">
              Votre espace client SHAMED
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Commandez vos produits dentaires, suivez vos commandes, consultez vos factures et échangez plus
              facilement avec l’équipe SHAMED.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 bg-shamed-navy text-white font-bold rounded-full hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg ring-1 ring-transparent hover:ring-shamed-copper/35"
              >
                Accéder à mon espace client
                <ArrowRight className="w-5 h-5" aria-hidden />
              </Link>
              <Link
                href="/login?role=admin"
                className="w-full sm:w-auto px-5 py-2.5 sm:py-3 text-sm font-medium text-gray-600 bg-shamed-bg/80 border border-shamed-border rounded-full hover:border-shamed-copper/45 hover:text-shamed-navy transition-colors flex items-center justify-center"
              >
                Accès équipe SHAMED
              </Link>
            </div>
            <p className="mt-6 text-sm text-gray-500 max-w-xl mx-auto">
              Plateforme propulsée par{' '}
              <span className="font-medium text-shamed-navy">Douma Dental Manager</span>.
            </p>
          </div>
        </div>

        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -top-1/2 -right-1/4 w-[1000px] h-[1000px] bg-shamed-navy/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/4 w-[800px] h-[800px] bg-shamed-copper/10 rounded-full blur-3xl" />
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-shamed-ink mb-4">Ce que vous pouvez faire en ligne</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Un espace simple pour votre activité professionnelle avec SHAMED.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<ShoppingBag className="w-8 h-8 text-shamed-copper" />}
              title="Commandes professionnelles"
              description="Passez vos commandes et suivez leur traitement depuis votre espace client."
            />
            <FeatureCard
              icon={<FileText className="w-8 h-8 text-shamed-copper" />}
              title="Documents et factures"
              description="Consultez vos factures, devis et historique de commandes."
            />
            <FeatureCard
              icon={<MessageCircle className="w-8 h-8 text-shamed-copper" />}
              title="Suivi commercial"
              description="Gardez un lien clair avec l’équipe SHAMED pour vos demandes, disponibilités et livraisons."
            />
          </div>
        </div>
      </section>

      {/* Contact strip */}
      <section id="contact" className="py-16 bg-shamed-bg border-y border-shamed-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-shamed-ink mb-4">Besoin d’aide pour vous connecter ?</h2>
          <p className="text-gray-600 mb-6 max-w-xl mx-auto">
            Contactez SHAMED : notre équipe vous aide pour l’accès, les commandes ou toute question professionnelle.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center text-shamed-navy font-medium flex-wrap">
            <a href="mailto:contact@shamed.ma" className="underline hover:text-shamed-copper transition-colors">
              contact@shamed.ma
            </a>
            <a href="tel:+212614150005" className="underline hover:text-shamed-copper transition-colors">
              +212 614 150 005
            </a>
            <a
              href="https://www.shamed.ma/contact.html"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-shamed-copper transition-colors"
            >
              Page contact sur shamed.ma
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-shamed-navy text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-8 h-8 rounded flex items-center justify-center font-bold bg-shamed-copper text-shamed-navy"
                  aria-hidden
                >
                  S
                </div>
                <span className="text-xl font-bold">SHAMED</span>
              </div>
              <p className="text-gray-300 max-w-sm text-sm leading-relaxed">
                Fourniture et accompagnement pour les professionnels dentaires au Maroc. Espace client réservé aux
                comptes professionnels SHAMED.
              </p>
              <p className="text-gray-400 text-xs mt-3">Espace client propulsé par Douma Dental Manager.</p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-shamed-copper">Liens utiles</h4>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>
                  <Link href="/login" className="hover:text-shamed-copper transition-colors">
                    Espace client SHAMED
                  </Link>
                </li>
                <li>
                  <a
                    href="https://www.shamed.ma"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-shamed-copper transition-colors"
                  >
                    Site shamed.ma
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.shamed.ma/contact.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-shamed-copper transition-colors"
                  >
                    Formulaire contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-shamed-copper">Contact</h4>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>
                  <a href="mailto:contact@shamed.ma" className="hover:text-white transition-colors">
                    contact@shamed.ma
                  </a>
                </li>
                <li>
                  <a href="tel:+212614150005" className="hover:text-white transition-colors">
                    +212 614 150 005
                  </a>
                </li>
                <li>Casablanca, Maroc</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-400 gap-4">
            <p>&copy; {new Date().getFullYear()} SHAMED. Tous droits réservés.</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="https://www.shamed.ma/politique-confidentialite.html"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                Confidentialité
              </a>
              <a
                href="https://www.shamed.ma/mentions-legales.html"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                Mentions légales
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="p-8 bg-white rounded-2xl border border-shamed-border shadow-sm hover:shadow-md hover:border-shamed-copper/35 transition-all group">
      <div className="w-14 h-14 bg-shamed-bg rounded-xl flex items-center justify-center mb-6 ring-1 ring-transparent group-hover:ring-shamed-copper/25 group-hover:bg-white transition-colors duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-shamed-ink mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{description}</p>
    </div>
  )
}
