import { $, $$, on } from 'll';
import { parse, PHPTypes } from 'php-serialized-data';
import type { AccessModifier } from 'php-serialized-data/dist-types/parse';

import Prism from 'prismjs/components/prism-core';
import 'prismjs/components/prism-json';

const input = $<HTMLTextAreaElement>( '#input' );
const output = $<HTMLDivElement>( '#output' );

const typeNames: { [ className: string ]: string } = {
	PHPCustomObject: 'object',
	PHPNull: 'null',
	PHPObject: 'object',
	PHPReference: 'reference',
	PHPString: 'string',
	PHPArray: 'array',
	PHPBoolean: 'boolean',
	PHPFloat: 'float',
	PHPInteger: 'integer',
};

function el<K extends keyof HTMLElementTagNameMap, P extends keyof HTMLElementTagNameMap[ K ]>(
	type: K,
	attr?: { -readonly [ property in P ]?: HTMLElementTagNameMap[ K ][ P ] },
	...children: ( string | HTMLElement )[]
): HTMLElementTagNameMap[ K ]

function el(
	type: string,
	attr?: { [ property: string ]: any },
	...children: ( string | HTMLElement )[]
): HTMLElement

function el(
	type: string,
	attr: { [ property: string ]: any } = {},
	...children: ( string | HTMLElement )[]
): HTMLElement {
	const element = document.createElement( type );
	for ( const [ key, value ] of Object.entries( attr ) ) {
		if ( key === 'data' ) {
			for ( const [ dataKey, dataValue ] of Object.entries( value as object ) ) {
				element.dataset[ dataKey ] = dataValue;
			}
		} else {
			element[ key ] = value;
		}
	}
	for ( const child of children ) {
		if ( typeof child === 'string' ) {
			element.insertAdjacentText( 'beforeend', child );
		} else {
			element.insertAdjacentElement( 'beforeend', child );
		}
	}
	return element;
}

function objectToElement( obj: PHPTypes.AllTypes ): HTMLElement {

	const phpTypeName = obj.constructor.name;
	const simpleTypeName = typeNames[ phpTypeName ];

	switch ( phpTypeName ) {

		case 'PHPBoolean':
		case 'PHPFloat':
		case 'PHPInteger':
		case 'PHPString':
		case 'PHPCustomObject':
			return el( 'div', { className: `value-type type-${simpleTypeName}` },
				el( 'div', { className: 'value' }, obj.toJs().toString() )
			);

		case 'PHPNull':
			return el( 'div', { className: `value-type type-${simpleTypeName}` } );

		case 'PHPReference':
			return el( 'div', { className: `value-type type-${simpleTypeName}` },
				el( 'div', { className: 'value' }, obj.toJs().toString() )
			);

		case 'PHPArray':
		case 'PHPObject':
			const entries = [ ...( obj.value as Map<PHPTypes.PHPString | PHPTypes.PHPInteger, PHPTypes.AllTypes> ).entries() ];
			const properties = el( 'dl', { className: 'value' } );
			const isObject = phpTypeName === 'PHPObject';

			for ( const [ keyObj, valueObj ] of entries ) {

				let accessModifier: AccessModifier,
					propertyName: string;

				if ( isObject ) {
					( { accessModifier, propertyName } = PHPTypes.PHPObject.propertyInfo( keyObj.toJs().toString(), ( obj as PHPTypes.PHPObject ).className ) );
					keyObj.value = propertyName;
				}

				const keyEl = objectToElement( keyObj );
				const valueEl = objectToElement( valueObj );

				if ( isObject ) {
					keyEl.classList.add( `access-${accessModifier}` );
				}

				properties.appendChild( el( 'div', {},
					el( 'dt', {}, keyEl ),
					el( 'dd', {}, valueEl ),
				) );
			}

			return el( 'details',
				{
					open: true,
					className: `value-type type-${simpleTypeName}`,
					style: [
						`--count: '${entries.length}';`,
						isObject ? `--type: '${( obj as PHPTypes.PHPObject ).className}';` : '',
					].join( ' ' ),
				},
				el( 'summary', {}, '' ),
				properties,
			);

	}

}

on( $<HTMLButtonElement>( 'button[name=view]' ), 'click' )( e => {

	output.innerHTML = '';

	try {
		const data = parse( input.value, { fixNulls: true } );
		output.appendChild( objectToElement( data ) );
	} catch ( e ) {
		output.appendChild( el( 'strong', {}, e.message ) );
	}

} );

on( $<HTMLButtonElement>( 'button[name=json]' ), 'click' )( e => {

	output.innerHTML = '';

	try {
		const data = parse( input.value, { fixNulls: true } );
		const js = data.toJs( { detectArrays: true, private: true } );
		const json = JSON.stringify( js, null, 2 );
		const pre = el( 'pre', { className: 'language-json' }, json );
		Prism.highlightElement( pre );
		output.appendChild( pre );
	} catch ( e ) {
		output.appendChild( el( 'strong', {}, e.message ) );
	}

} );

on( $<HTMLButtonElement>( 'button[name=copy]' ), 'click' )( function ( e ) {

	output.innerHTML = '';

	try {
		const data = parse( input.value, { fixNulls: true } );
		const js = data.toJs( { detectArrays: true, private: true } );
		const json = JSON.stringify( js, null, 2 );
		navigator.clipboard.writeText( json );
		output.append( 'Copied!' );
	} catch ( e ) {
		output.appendChild( el( 'strong', {}, e.message ) );
	}

} );
