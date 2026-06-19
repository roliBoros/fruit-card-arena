import { cards as characterDefinitions } from './cards';
import { validateCards } from './validateCards';

export const cards = validateCards(characterDefinitions);
export const cardById = Object.fromEntries(cards.map((card) => [card.id, card]));
