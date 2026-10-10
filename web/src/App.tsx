import './App.css'

const etapes = [
  { numero: '01', titre: 'Trouver son stage', description: 'Des offres aux candidatures, préparez votre prochaine expérience.' },
  { numero: '02', titre: 'Préparer sa convention', description: 'Un parcours partagé avec votre entreprise et votre établissement.' },
  { numero: '03', titre: 'Avancer ensemble', description: 'Gardez le lien avec vos encadrants tout au long de votre stage.' },
]

export default function App() {
  return (
    <div className="page">
      <header className="entete">
        <a className="marque" href="#accueil" aria-label="Plateforme PFE, accueil">
          <span className="monogramme" aria-hidden="true">P</span>
          Plateforme PFE
        </a>
        <span className="statut">Ouverture prochaine</span>
      </header>
      <main id="accueil">
        <section className="introduction" aria-labelledby="titre">
          <p className="surtitre">Stages · Projets de fin d’études</p>
          <h1 id="titre">Votre stage,<br /><span>un parcours accompagné.</span></h1>
          <p className="description">
            Un espace commun pour les étudiants, les entreprises et les encadrants.
            De la première candidature à l’évaluation finale.
          </p>
          <p className="information">Votre espace de gestion des stages est en préparation.</p>
        </section>
        <section aria-labelledby="parcours">
          <h2 id="parcours" className="titre-parcours">Chaque étape compte.</h2>
          <ol className="etapes">
            {etapes.map((etape) => (
              <li key={etape.numero}>
                <span className="numero" aria-hidden="true">{etape.numero}</span>
                <h3>{etape.titre}</h3>
                <p>{etape.description}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <footer>FST Marrakech · Stages et projets de fin d’études</footer>
    </div>
  )
}
