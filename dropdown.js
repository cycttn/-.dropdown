/* The MIT License */

(function($){
    
    var data_key = "dropdown_obj";
    var detKey = "Detail";
    
    var entry = $("<li />").addClass('entry');
    var container = $("<ul />").addClass('entries');
    
    var dData = $("<span />").addClass('dData');
    var dHead = $("<span />").addClass('dHead');
    var dItem = $("<div />").addClass("dItem").append(dHead).append(dData);
    var detail = $("<div />").addClass('detail');

    var defaults = {
        dropText: '.text',
        group: 'dropdownMain',
        detail: null,
        getValue: getValue,
        multiple: false,
        usekeys: false
    };
    
    var all = []; 
    
    //Hide all!!
    $(document).click(function(){
        for(var i=0; i<all.length; i++)
            $.popupMgr.hide(all[i]);
    });
    
    if( !Object.keys ){
        Object.keys = function(obj){
            var keys = [];
            for(var k in obj) keys.push(k);
            return keys; 
        };
    }
    
    function getValue(){ return $(this).text(); }    
        
    function sanitize(str){ return str.toLowerCase().replace(/[^A-Za-z_0-9]/, '_'); }
        
    $.dropdown = function(entries, opts, el){
        this.$this = $(el); 
        this.o = $.extend({}, defaults, opts);                

        this.$text = this.$this.find(this.o.dropText);
        if( this.$text.length == 0 ) this.$text = this.$this;
        this.placeholder = this.$text.text(); 
        
        this.reset(entries); //resets!         
    };
    
    $.dropdown.prototype.createEntries = function(entries){
        if( !$.isArray(entries) || entries.length == 0 ) throw new "Cannot Use Empty Array For Entries";
        
        //Create entries
        this.entries = {
            txt: entries,
            jQ: container.clone()
        };
        
        var selected = []; 
        for(var i=0; i<entries.length; i++ ){
            var isObj = $.isPlainObject(entries[i]);
            var val = isObj? entries[i].value : entries[i]; 
            var key = (isObj && 'key' in entries[i])? entries[i].key : i;
            var currEntry = entry.clone().attr('data-id', key).html( val );
            if( isObj && 'selected' in entries[i] && entries[i].selected ){
                selected.push(currEntry);
            }
            this.entries.jQ.append( currEntry );            
        }
        
        for(var i=0; i<selected.length; i++ )
            this.select(selected[i]);
        
        //Create detail if need
        this.detailCreated = false;
        if( !this.o.detail && entries[0].detail ){
            //var n = Object.keys(entries[0].detail).length;
            this.o.detail = detail.clone();
            for( var i in entries[0].detail ){
                var d = dItem.clone();
                d.find('.dHead').html( i );
                d.find('.dData').addClass( sanitize(i) );
                this.o.detail.append( d );                
            }
            
            this.detailCreated=true;
        }
        
    };
    
    /**
     * Resets the dropdown
     * @param {type} entries
     * @param {type} options
     * @returns {undefined}
     */
    $.dropdown.prototype.reset = function(entries, options){
        if( options ) $.extend(this.o, options);
        if( entries ) this.createEntries(entries);

        try{ 
            $.popupMgr.create(this.o.group); //create the dropdown group. If fails, means group already created
        }catch(e){}finally{
            if( entries[0].detail ){
                $.popupMgr.create(this.o.group+detKey);
                all.push(this.o.group+detKey);
            } //create the group for detail      
            all.push(this.o.group);
        }
        
        //Call popupMgr for this.entries; click on/off; 
        this.$this.popupMgr(this.entries.jQ, {'name': this.o.group, 'on': 'click', 'off': 'click'});
        
        //Add event listeners to each entry; 
        this.entries.jQ.find('li.entry').hover(
            $.proxy(updateDetail, this), 
            $.proxy(hideDetail, this)
        ).click($.proxy(function(e){
            if( !this.o.multiple ) $.popupMgr.hide(this.o.group); 
            
            var $el = $(e.currentTarget);            
            if( $el.is('.selected') ){
                this.unselect($el);
            }else{
                this.select($el);
            }

            e.stopPropagation();            
        }, this));
        
    };
    
    $.dropdown.prototype.select = function($el){
        if( $.isNumeric($el) ) $el = this.entries.jQ.find('li.entry').eq($el);
        else if( ! $el instanceof jQuery ) return; 
        if( $el.length == 0 ) return;
        
        this.$this.addClass('selected');
        
        if( this.o.multiple ){
            $el.addClass('selected');
            updateTextForMultiple.call(this);
        }else{
            this.entries.jQ.find('li.entry.selected').removeClass('selected');
            $el.addClass('selected');
            this.$text.html( this.o.getValue.call($el) );
        }
        
        this.$this.trigger('select.dropdown', [this.val(), this.val(1)]);
    };
    
    $.dropdown.prototype.unselect = function($el){
        if( !$el ) $el = this.entries.jQ.find('li.entry.selected');
        if( $.isNumeric($el) ){ $el = this.entries.jQ.find('li.entry').eq($el); }        
        if( $el.length ==0 ) return;
        
        $el.removeClass('selected');
        if( this.o.multiple ){
            updateTextForMultiple.call(this);
        }else{
            usePlaceholder.call(this);
        }
    };
    
    $.dropdown.prototype.val = function(t){
        if( t === null ) t = this.o.usekeys;

        var arr = [], g = this.o.getValue; 
        this.entries.jQ.find('li.entry.selected').each(function(){
            t? arr.push( $(this).attr('data-id') ) : arr.push( g.call(this) );
        });
        
        return arr;
    };
    
    function updateTextForMultiple(){
        var arr = []; 
        var g = this.o.getValue; 
        this.entries.jQ.find('li.entry.selected').each(function(){
            arr.push( g.call(this) );
        });
        
        arr.length? this.$text.html( arr.join(', ') ) : usePlaceholder.call(this);     
    }
    
    function usePlaceholder(){
        this.$text.html(this.placeholder);
        this.$this.removeClass('selected');
    }
    
    function updateDetail(e){
        if( !this.o.detail ) return;    
        
        var ind = $(e.currentTarget).index();
        if( !'detail' in this.entries.txt[ind] ) return;
        
        var detail = this.entries.txt[ind].detail;
                
        //set the detail information; 
        var d; 
        for(var i in detail){
            d = detail[i]; 
            if( this.detailCreated ) i = "." + sanitize(i);
            this.o.detail.find(i).html( d );
        }
        
        //show the popup
        $.popupMgr.show(this.entries.jQ, {name: this.o.group+detKey, data: this.o.detail, showOn: 1});
    }
    
    function hideDetail(){
        if( this.o.detail ) $.popupMgr.hide( this.o.group + detKey );
    }
        
    $.fn.dropdown = function(entries, opts){
        if( !$.popupMgr ) throw "Dropdown needs popupMgr to work!";
        //if( !entries && opts || !$.isArray(entries) ) throw "Entries need to be provided"; 
        
        if( $(this).length == 1){
            var l = $(this).data(data_key); 
            if( l instanceof $.dropdown ) return l; 
            
            l = new $.dropdown(entries, opts, this);
            $(this).data(data_key, l); 
            return l; 
        }else{
            var arr = [];
            $(this).each(function(){ arr.push( $(this).dropdown(entries, opts)); });
            return arr;
        }        
    };
    
    
})(jQuery); 