/**
 * ============================================================================
 *  ORIGINES DES PRÉNOMS (indicatif, à enrichir librement)
 * ============================================================================
 *  L'INSEE ne fournit pas l'origine des prénoms : cette liste est faite à la
 *  main pour les prénoms courants, selon leur étymologie la plus admise.
 *  Pour en ajouter : écrire le prénom dans la bonne liste (accents facultatifs).
 *  Un prénom absent d'ici apparaît simplement sans origine.
 * ============================================================================
 */

export const ORIGINS: Record<string, string[]> = {
  Hébraïque: [
    'Adam', 'Gabriel', 'Gabrielle', 'Raphaël', 'Raphaëlle', 'Nathan', 'Noé', 'Noah', 'Samuel', 'Daniel', 'David', 'Michel', 'Michaël',
    'Jean', 'Jeanne', 'Johanna', 'Johan', 'Jonathan', 'Joseph', 'Joséphine', 'Benjamin', 'Jacob', 'Simon', 'Thomas', 'Tom', 'Matthieu',
    'Mathis', 'Mathéo', 'Élie', 'Elias', 'Ezra', 'Ruben', 'Aaron', 'Isaac', 'Emmanuel', 'Manon', 'Marie', 'Maria', 'Myriam', 'Anna',
    'Anne', 'Hannah', 'Sarah', 'Léa', 'Eva', 'Ève', 'Élisabeth', 'Elisa', 'Lisa', 'Élise', 'Rebecca', 'Judith', 'Suzanne', 'Salomé',
    'Eden', 'Naomi', 'Noémie', 'Joachim', 'Josué', 'Ethan', 'Abel', 'Ismaël', 'Nathanaël', 'Elsa',
  ],
  Grecque: [
    'Chloé', 'Zoé', 'Théo', 'Théodore', 'Timothée', 'Alexandre', 'Alexis', 'Nicolas', 'Philippe', 'Christophe', 'Sophie', 'Hélène',
    'Agathe', 'Margaux', 'Margot', 'Marguerite', 'Irène', 'Ariane', 'Iris', 'Daphné', 'Pénélope', 'Basile', 'Achille', 'Ulysse',
    'Hector', 'André', 'Georges', 'Catherine', 'Anastasia', 'Eugénie', 'Mélissa', 'Thaïs', 'Cassandre', 'Apolline', 'Athénaïs',
    'Stéphane', 'Agnès', 'Inès', 'Damien', 'Grégoire', 'Jason', 'Sébastien', 'Bastien', 'Barbara', 'Dorothée', 'Angèle', 'Ophélie',
    'Calypso', 'Mélanie', 'Côme', 'Jérôme', 'Tiphaine', 'Bérénice', 'Léandre', 'Aristide', 'Eugène', 'Philomène', 'Lysandre',
  ],
  Latine: [
    'Jules', 'Julien', 'Julie', 'Juliette', 'Julia', 'Paul', 'Pauline', 'Victor', 'Victoire', 'Victoria', 'Martin', 'Clément',
    'Clémence', 'Clémentine', 'Antoine', 'Antonin', 'Marius', 'Valentin', 'Valentine', 'Maxime', 'Émile', 'Émilie', 'Émilien', 'Lucie',
    'Lucien', 'Lucile', 'Camille', 'Cécile', 'Romane', 'Romain', 'Aurélien', 'Aurélie', 'Aurore', 'Rose', 'Violette', 'Laure', 'Laura',
    'Laurent', 'Céleste', 'Félix', 'Augustin', 'Auguste', 'Octave', 'Sylvain', 'Sylvie', 'Fabien', 'Marc', 'Florian', 'Flore',
    'Florence', 'Constance', 'Vincent', 'Diane', 'Olivia', 'Olivier', 'Léon', 'Léonie', 'Léo', 'Noël', 'Nathalie', 'Clara', 'Claire',
    'Valérie', 'Marcel', 'Marceau', 'Adrien', 'Benoît', 'Célestin', 'Dominique', 'Fabrice', 'Gabin', 'Justin', 'Marin', 'Maxence',
    'Patrice', 'Quentin', 'Rémi', 'Séverine', 'Valère', 'Vivien', 'Virgile', 'Albane', 'Aurèle', 'Amandine', 'Sixtine', 'Capucine',
  ],
  Germanique: [
    'Louis', 'Louise', 'Hugo', 'Charles', 'Charlotte', 'Henri', 'Albert', 'Léonard', 'Bernard', 'Robin', 'Robert', 'Richard',
    'Raymond', 'Gérard', 'Roland', 'Guillaume', 'Gauthier', 'Thibault', 'Lambert', 'Emma', 'Mathilde', 'Alice', 'Adèle', 'Clotilde',
    'Bertille', 'Héloïse', 'Éloïse', 'Aloïs', 'Odile', 'Edmond', 'Ernest', 'Ferdinand', 'Léopold', 'Amaury', 'Thierry', 'Aymeric',
    'Arnaud', 'Bruno', 'Aude', 'Blanche', 'Frédéric', 'Gilbert', 'Hubert', 'Maud', 'Norbert', 'Roger', 'Armand', 'Baudouin', 'Clovis',
    'Alix', 'Adélaïde', 'Ida', 'Frida', 'Edwige', 'Fernand', 'Charlie', 'Harry', 'Willy', 'William', 'Wilfried', 'Lou',
  ],
  'Celtique / bretonne': [
    'Arthur', 'Maël', 'Maëlle', 'Gaël', 'Gaëlle', 'Gwenaëlle', 'Erwan', 'Yann', 'Nolwenn', 'Morgane', 'Tristan', 'Ewen', 'Brieuc',
    'Loïc', 'Malo', 'Dylan', 'Brendan', 'Ronan', 'Elouan', 'Tanguy', 'Enora', 'Maïwenn', 'Kylian', 'Killian', 'Corentin', 'Gwendal',
    'Klervi', 'Soazig', 'Rozenn', 'Yuna', 'Awen', 'Liam', 'Logan', 'Ryan', 'Kevin', 'Alan', 'Briac', 'Glenn',
  ],
  Arabe: [
    'Rayan', 'Amir', 'Nour', 'Amira', 'Malik', 'Karim', 'Samir', 'Leïla', 'Amine', 'Kenza', 'Salma', 'Imran', 'Naïm', 'Hamza',
    'Mehdi', 'Mohamed', 'Ahmed', 'Ali', 'Omar', 'Bilal', 'Sofiane', 'Inaya', 'Wassim', 'Anas', 'Fatima', 'Aïcha', 'Khadija', 'Zineb',
    'Farah', 'Rania', 'Ambre', 'Soumaya', 'Djamel', 'Amel',
  ],
  Persane: ['Gaspard', 'Roxane', 'Yasmine', 'Yasmina', 'Jasmine', 'Esther', 'Darius', 'Cyrus'],
  Scandinave: ['Axel', 'Ingrid', 'Astrid', 'Solveig', 'Erik', 'Éric', 'Sven', 'Freya', 'Liv', 'Nils', 'Leif', 'Siri', 'Olaf', 'Gustave', 'Gunnar'],
  Slave: ['Mila', 'Sacha', 'Nadia', 'Milan', 'Vera', 'Olga', 'Natacha', 'Boris', 'Ivan', 'Milena', 'Ludmila', 'Vladimir', 'Katia', 'Stanislas', 'Wanda', 'Anouchka'],
  Italienne: ['Enzo', 'Lorenzo', 'Matteo', 'Luca', 'Giulia', 'Bianca', 'Chiara', 'Giovanni', 'Alessio', 'Francesca', 'Paolo', 'Mattia', 'Nino', 'Lino', 'Gianni'],
  'Espagnole / basque': ['Lola', 'Paloma', 'Carmen', 'Diego', 'Pablo', 'Juan', 'Carlos', 'Mercedes', 'Pilar', 'Nuria', 'Esteban', 'Mateo', 'Iker', 'Xavier', 'Alba'],
  'Anglo-saxonne': ['Mason', 'Jayden', 'Tyler', 'Ashley', 'Lily', 'Shirley', 'Kimberley', 'Bradley', 'Kayden', 'Harley', 'Brandon', 'Kelly'],
}

/** Normalise pour comparer sans accents ni casse. */
export const normName = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

const INDEX = new Map<string, string>()
for (const [origin, names] of Object.entries(ORIGINS)) for (const n of names) INDEX.set(normName(n), origin)

export function originOf(name: string): string | undefined {
  return INDEX.get(normName(name))
}

export const ORIGIN_LIST = Object.keys(ORIGINS)
