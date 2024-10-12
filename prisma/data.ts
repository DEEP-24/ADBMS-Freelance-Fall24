import {faker} from '@faker-js/faker'

export const restaurantSeedData = [
	{
		name: 'Food Truck 01',
		image:
			'https://www.nicepng.com/png/full/220-2204766_chipotle-logo-transparent-chipotle-mexican-grill-logo.png',
		items: [
			{
				name: 'Pizza',
				description:
					"Pizza is a savory dish of Italian origin, consisting of a usually round, flattened base of leavened wheat-based dough topped with tomatoes, cheese, and often, anchovies or olives, often with various additional toppings baked into a pizza-dough. Pizza is popular in many countries, including the United States, Europe, Africa, and Oceania. The term pizza is derived from the Italian word pizza, which means 'small dish'",
				image:
					'https://images.unsplash.com/photo-1585238342024-78d387f4a707?auto=format&fit=crop&w=800&q=80',
				price: Number(faker.finance.amount(5, 50, 2)),
			},
			{
				name: 'Burger',
				description:
					'A burger is a sandwich consisting of one or more cooked patties of ground meat, usually beef, placed inside a sliced bread roll or bun.',
				image:
					'https://images.unsplash.com/photo-1572448862527-d3c904757de6?auto=format&fit=crop&w=800&q=80',
				price: Number(faker.finance.amount(5, 50, 2)),
			},
		],
	},
]
