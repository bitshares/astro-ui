import{k as O,_ as v,u as e,v as u,a3 as J,I as $,J as F,T as E,V as R,W as _,X as B,Y as M,K as c,P,Q as X,S as q,O as A}from"./button.XYtNsIwi.js";import{r as i}from"./index.ebYJtNMn.js";import{n as I,l as U}from"./Init.bfqq3PXC.js";import{T as W,a as H,c as x,e as D,j as K}from"./common.6T91TtJH.js";import{E as Q}from"./ExternalLink.-0J4CEiX.js";const V=i.forwardRef((s,n)=>i.createElement(O.label,v({},s,{ref:n,onMouseDown:a=>{var l;(l=s.onMouseDown)===null||l===void 0||l.call(s,a),!a.defaultPrevented&&a.detail>1&&a.preventDefault()}}))),m=V,Y=J("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"),d=i.forwardRef(({className:s,...n},a)=>e.jsx(m,{ref:a,className:u(Y(),s),...n}));d.displayName=m.displayName;const j=i.forwardRef(({className:s,...n},a)=>e.jsx("textarea",{className:u("flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",s),ref:a,...n}));j.displayName="Textarea";let f=[];const[z]=I({fetcher:(...s)=>fetch(`http://localhost:8080/api/deeplink/${s[0]}/${s[1]}`,{method:"POST",body:JSON.stringify(f)}).then(async n=>{if(!n.ok)throw console.log("Failed to generate deeplink"),new Error("Failed to generate deeplink");let a;try{a=await n.json()}catch{throw console.log("Failed to parse JSON"),new Error("Failed to parse JSON")}return a}).then(n=>{if(n&&n.result){const a=P(X(n.result,!0)),l=q(a),r=JSON.parse(l);if(r.generatedDeepLink)return r.generatedDeepLink}throw new Error("No deep link generated")})});function se(s){const{trxJSON:n,operationName:a,usrChain:l,headerText:r,dismissCallback:k,username:L,userID:N}=s,{t,i18n:G}=$(F.get(),{i18n:A}),C=i.useMemo(()=>(f=n,z([l,a])),[l,a,n]),{data:h,loading:o,error:w}=U(C),[p,b]=i.useState(!1),y=()=>{p||(b(!0),setTimeout(()=>{b(!1)},1e4))},[T,g]=i.useState("object");return e.jsx(E,{open:!0,onOpenChange:S=>{k(S)},children:e.jsxs(R,{className:"sm:max-w-[800px] bg-white",children:[e.jsxs(_,{children:[e.jsx(B,{children:o?t("DeepLinkDialog:dialogContent.generatingDeeplink"):e.jsx(e.Fragment,{children:r})}),e.jsxs(M,{children:[t("DeepLinkDialog:dialogContent.withAccount",{username:L,userID:N}),o?null:e.jsxs(e.Fragment,{children:[t("DeepLinkDialog:dialogContent.readyToBroadcast"),e.jsx("br",{}),t("DeepLinkDialog:dialogContent.chooseMethod"),e.jsx(Q,{classnamecontents:"text-blue-500",type:"text",text:t("DeepLinkDialog:dialogContent.beetWallet"),hyperlink:"https://github.com/bitshares/beet"})]}),w?t("DeepLinkDialog:dialogContent.errorOccurred"):null]})]}),e.jsxs(e.Fragment,{children:[e.jsx("hr",{className:"mt-3"}),e.jsx("div",{className:"grid grid-cols-1 gap-3",children:e.jsxs(W,{defaultValue:"object",className:"w-full",children:[e.jsxs(H,{className:"grid w-full grid-cols-3 gap-2",children:[e.jsx(x,{value:"object",onClick:()=>g("object"),children:t("DeepLinkDialog:tabs.viewTRXObject")},"TRXTab"),e.jsx(x,{value:"deeplink",onClick:()=>g("deeplink"),children:t("DeepLinkDialog:tabs.rawDeeplink")},"DLTab"),e.jsx(x,{value:"localJSON",onClick:()=>g("localJSON"),children:t("DeepLinkDialog:tabs.localJSONFile")},"JSONTab")]},`${T}_TabList`),e.jsxs(D,{value:"object",children:[e.jsxs("div",{className:"grid w-full gap-1.5 mb-3",children:[e.jsx(d,{className:"text-left",children:t("DeepLinkDialog:tabsContent.transactionObjectJSON")}),e.jsx("span",{className:"text-left text-sm",children:t("DeepLinkDialog:tabsContent.operationType",{operationName:a})}),e.jsx(j,{value:JSON.stringify(n,null,4),className:"min-h-[250px]",id:"trxJSON",readOnly:!0})]}),e.jsx(c,{onClick:()=>{K(JSON.stringify(n,null,4))},children:t("DeepLinkDialog:tabsContent.copyOperationJSON")})]}),e.jsxs(D,{value:"deeplink",children:[e.jsx(d,{className:"text-left",children:t("DeepLinkDialog:tabsContent.usingDeeplink")}),e.jsxs("ol",{className:"ml-4",children:[e.jsx("li",{type:"1",children:t("DeepLinkDialog:tabsContent.step1")}),e.jsx("li",{type:"1",children:t("DeepLinkDialog:tabsContent.step2",{operationName:a})}),e.jsx("li",{type:"1",children:t("DeepLinkDialog:tabsContent.step3")}),e.jsx("li",{type:"1",children:t("DeepLinkDialog:tabsContent.step4")}),e.jsx("li",{type:"1",children:t("DeepLinkDialog:tabsContent.step5")})]}),o?null:e.jsx("a",{href:`rawbeet://api?chain=${l==="bitshares"?"BTS":"BTS_TEST"}&request=${h}`,children:e.jsx(c,{className:"mt-4",children:t("DeepLinkDialog:tabsContent.triggerRawBeet")})})]}),e.jsxs(D,{value:"localJSON",children:[e.jsx(d,{className:"text-left",children:t("DeepLinkDialog:tabsContent.viaLocalFile")}),e.jsxs("ol",{className:"ml-4",children:[e.jsx("li",{type:"1",children:t("DeepLinkDialog:tabsContent.step1Local")}),e.jsx("li",{type:"1",children:t("DeepLinkDialog:tabsContent.step2Local",{operationName:a})}),e.jsx("li",{type:"1",children:t("DeepLinkDialog:tabsContent.step3Local")}),e.jsx("li",{type:"1",children:t("DeepLinkDialog:tabsContent.step4Local")}),e.jsx("li",{type:"1",children:t("DeepLinkDialog:tabsContent.step5Local")})]}),!o&&p?e.jsx(c,{className:"mt-4",variant:"outline",disabled:!0,children:t("DeepLinkDialog:tabsContent.downloading")}):null,!o&&!p?e.jsx("a",{href:`data:text/json;charset=utf-8,${h}`,download:`${a}.json`,target:"_blank",rel:"noreferrer",onClick:y,children:e.jsx(c,{className:"mt-4",children:t("DeepLinkDialog:tabsContent.downloadBeetOperationJSON")})}):null]})]})})]})]})})}export{se as D,d as L};