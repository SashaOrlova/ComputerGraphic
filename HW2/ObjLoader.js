if (typeof String.prototype.startsWith !== 'function') {
  String.prototype.startsWith = function (str){
    return this.slice(0, str.length) === str;
  };
}
var obj_loader = {};

obj_loader.Mesh = function( objectData ){
  var verts = [];
  var vertNormals = [];
  var textures = [];

  var packed = {};
  packed.verts = [];
  packed.norms = [];
  packed.textures = [];
  packed.hashindices = {};
  packed.indices = [];
  packed.index = 0;

  var lines = objectData.split( '\n' );
  for( var i=0; i<lines.length; i++ ){
    if( lines[ i ].startsWith( 'v ' ) ){
      line = lines[ i ].slice( 2 ).split( " " );
      verts.push( line[ 0 ] );
      verts.push( line[ 1 ] );
      verts.push( line[ 2 ] );
    }
    else if( lines[ i ].startsWith( 'vn' ) ){
      line = lines[ i ].slice( 3 ).split( " " );
      vertNormals.push( line[ 0 ] );
      vertNormals.push( line[ 1 ] );
      vertNormals.push( line[ 2 ] );
    }
    else if( lines[ i ].startsWith( 'vt' ) ){
      line = lines[ i ].slice( 3 ).split( " " );
      textures.push( line[ 0 ] );
      textures.push( line[ 1 ] );
    }
    else if( lines[ i ].startsWith( 'f ' ) ){
      line = lines[ i ].slice( 2 ).split( " " );
      var quad = false;
      for(var j=0; j<line.length; j++){
        if(j == 3 && !quad) {
          j = 2;
          quad = true;
        }

        if( line[ j ] in packed.hashindices ){
          packed.indices.push( packed.hashindices[ line[ j ] ] );
        }
        else{
          face = line[ j ].split( '/' );
          packed.verts.push( verts[ (face[ 0 ] - 1) * 3 + 0 ] );
          packed.verts.push( verts[ (face[ 0 ] - 1) * 3 + 1 ] );
          packed.verts.push( verts[ (face[ 0 ] - 1) * 3 + 2 ] );
          packed.textures.push( textures[ (face[ 1 ] - 1) * 2 + 0 ] );
          packed.textures.push( textures[ (face[ 1 ] - 1) * 2 + 1 ] );
          packed.norms.push( vertNormals[ (face[ 2 ] - 1) * 3 + 0 ] );
          packed.norms.push( vertNormals[ (face[ 2 ] - 1) * 3 + 1 ] );
          packed.norms.push( vertNormals[ (face[ 2 ] - 1) * 3 + 2 ] );
          packed.hashindices[ line[ j ] ] = packed.index;
          packed.indices.push( packed.index );
          packed.index += 1;
        }

        if(j == 3 && quad) {
          packed.indices.push( packed.hashindices[ line[ 0 ] ] );
        }
      }
    }
  }
  this.vertices = packed.verts;
  this.vertexNormals = packed.norms;
  this.textures = packed.textures;
  this.indices = packed.indices;
};